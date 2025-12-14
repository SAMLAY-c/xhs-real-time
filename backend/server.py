#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MediaCrawler Dashboard Backend
FastAPI server with WebSocket support for real-time crawling monitoring
"""

import asyncio
import json
import sys
import os
import time
from typing import Dict, Any, Optional, List, Set
from contextlib import asynccontextmanager
from collections import deque  # 引入双端队列用于限制日志长度
from datetime import datetime
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import redis.asyncio as redis

# Add parent directory to Python path to import MediaCrawler modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# from cmd_arg import ArgumentParser
from config import base_config
from base.base_crawler import AbstractCrawler
from media_platform.xhs import XiaoHongShuCrawler
from store import xhs as xhs_store
from var import crawler_type_var


class CrawlRequest(BaseModel):
    keyword: str
    count: int = 20
    platform: str = "xhs"
    session_id: Optional[str] = None  # 允许前端指定session_id


class CrawlResponse(BaseModel):
    success: bool
    message: str
    session_id: Optional[str] = None


class SessionData:
    """会话数据，状态与连接分离"""
    def __init__(self, max_logs=500):
        # 使用 deque 限制最大日志条数，防止内存溢出
        self.logs: deque = deque(maxlen=max_logs)
        self.crawled_count: int = 0
        self.is_running: bool = False
        # 支持同一会话下多个 WebSocket 连接（多标签页监控）
        self.active_sockets: Set[WebSocket] = set()
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None
        self.error_message: Optional[str] = None
        # 记录会话关联的请求信息，用于历史查询
        self.keyword: str = ""
        self.platform: str = ""
        self.request_count: int = 0


class SessionManager:
    """优化的会话管理器：状态与连接分离"""
    def __init__(self):
        self.sessions: Dict[str, SessionData] = {}
        self.redis_client: Optional[redis.Redis] = None

    async def init_redis(self):
        """Initialize Redis connection for caching"""
        try:
            self.redis_client = redis.Redis(
                host='localhost',
                port=6379,
                decode_responses=True,
                socket_connect_timeout=5
            )
            await self.redis_client.ping()
            print("✅ Redis connected successfully")
        except Exception as e:
            print(f"⚠️ Redis connection failed: {e}")
            self.redis_client = None

    def get_session(self, session_id: str) -> SessionData:
        """获取或创建会话"""
        if session_id not in self.sessions:
            self.sessions[session_id] = SessionData()
            print(f"🆕 Created new session: {session_id}")
        return self.sessions[session_id]

    async def connect(self, session_id: str, websocket: WebSocket):
        """WebSocket连接 - 断点续传"""
        await websocket.accept()
        session = self.get_session(session_id)
        session.active_sockets.add(websocket)
        print(f"🔌 WebSocket connected for session: {session_id}")

        # 1. 立即发送最近的历史日志 (断点续传体验)
        if session.logs:
            # 合并发送历史日志以减少网络开销
            history_logs = "\n".join(session.logs)
            await websocket.send_text(history_logs)
            print(f"📜 Sent {len(session.logs)} historical logs")

        # 2. 发送当前状态
        await self.send_stat_update(session_id)
        print(f"📊 Sent current status for session: {session_id}")

    def disconnect(self, session_id: str, websocket: WebSocket):
        """WebSocket断开 - 保留状态，只移除当前连接"""
        if session_id in self.sessions:
            session = self.sessions[session_id]
            if websocket in session.active_sockets:
                session.active_sockets.discard(websocket)
            print(f"🔌 WebSocket disconnected for session: {session_id}")

    async def safe_emit(self, session_id: str, message: str):
        """安全发送日志文本"""
        session = self.get_session(session_id)
        session.logs.append(message)  # 自动丢弃最旧的日志

        # 向所有活跃连接广播日志
        if session.active_sockets:
            dead_sockets = []
            for ws in list(session.active_sockets):
                try:
                    await ws.send_text(message)
                except Exception as e:
                    # 连接已断开，移除失效的 socket
                    print(f"⚠️ Failed to send message to {session_id}: {e}")
                    dead_sockets.append(ws)
            for ws in dead_sockets:
                session.active_sockets.discard(ws)

    async def send_stat_update(self, session_id: str):
        """发送结构化统计数据"""
        session = self.get_session(session_id)
        if session.active_sockets:
            payload = json.dumps({
                "type": "stats",
                "crawled_count": session.crawled_count,
                "status": "running" if session.is_running else "stopped",
                "start_time": session.start_time,
                "error_message": session.error_message
            }, ensure_ascii=False)
            dead_sockets = []
            for ws in list(session.active_sockets):
                try:
                    await ws.send_text(payload)
                except Exception as e:
                    print(f"⚠️ Failed to send stats to {session_id}: {e}")
                    dead_sockets.append(ws)
            for ws in dead_sockets:
                session.active_sockets.discard(ws)

    async def send_data_update(self, session_id: str, data_item: dict):
        """发送实时数据更新"""
        session = self.get_session(session_id)
        if session.active_sockets:
            message = json.dumps({
                "type": "data",
                "data": data_item,
                "status": "success"
            }, ensure_ascii=False)
            dead_sockets = []
            for ws in list(session.active_sockets):
                try:
                    await ws.send_text(message)
                except Exception as e:
                    print(f"⚠️ Failed to send data to {session_id}: {e}")
                    dead_sockets.append(ws)
            for ws in dead_sockets:
                session.active_sockets.discard(ws)

    async def set_status(self, session_id: str, is_running: bool, error_message: str = None):
        """更新会话状态"""
        session = self.get_session(session_id)
        session.is_running = is_running
        session.error_message = error_message

        if not is_running:
            session.end_time = asyncio.get_event_loop().time()

        await self.send_stat_update(session_id)

    async def increment_count(self, session_id: str):
        """增加爬取计数"""
        session = self.get_session(session_id)
        session.crawled_count += 1
        await self.send_stat_update(session_id)

    # 兼容旧接口
    async def send_personal_message(self, message: Dict[str, Any], session_id: str):
        """兼容旧的send_personal_message接口"""
        if message.get("type") == "data":
            await self.send_data_update(session_id, message.get("data"))
        else:
            # 对于其他类型的消息，转换为日志格式
            msg_text = message.get("message", str(message))
            await self.safe_emit(session_id, msg_text)


# Global session manager
manager = SessionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan"""
    await manager.init_redis()
    yield
    # Cleanup
    if manager.redis_client:
        await manager.redis_client.close()


app = FastAPI(
    title="MediaCrawler Dashboard API",
    description="Web UI for MediaCrawler with real-time monitoring",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "MediaCrawler Dashboard API is running"}


@app.post("/api/crawl/start", response_model=CrawlResponse)
async def start_crawl(request: CrawlRequest, background_tasks: BackgroundTasks):
    """Start crawling process and return session ID"""
    try:
        # Generate or use provided session ID
        import uuid
        session_id = request.session_id or str(uuid.uuid4())

        # Update global configuration
        base_config.KEYWORDS = request.keyword
        base_config.CRAWLER_MAX_NOTES_COUNT = request.count
        base_config.PLATFORM = request.platform
        base_config.CRAWLER_TYPE = "search"

        # Try to create crawler instance first to test
        try:
            print(f"📋 Testing crawler creation for platform: {request.platform}")
            crawler_factory = CrawlerFactory()
            test_crawler = crawler_factory.create_crawler(request.platform)
            print(f"✅ Test crawler created successfully: {type(test_crawler)}")
        except Exception as e:
            print(f"❌ Failed to create crawler: {e}")
            raise HTTPException(status_code=500, detail=f"Crawler creation failed: {str(e)}")

        # 使用 BackgroundTasks 提交任务，API 立即返回成功
        background_tasks.add_task(run_crawler_task, session_id, request)
        print(f"✅ Crawler task scheduled for session: {session_id}")

        return CrawlResponse(
            success=True,
            message=f"Started crawling for '{request.keyword}' on {request.platform}",
            session_id=session_id
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start crawling: {str(e)}")


@app.websocket("/ws/logs/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time log updates - 支持断点续传"""
    await manager.connect(session_id, websocket)
    try:
        while True:
            # 保持连接活跃，也可以在这里接收前端的控制指令
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
            elif data == "stop":
                # 可以处理停止指令
                await manager.set_status(session_id, False, "用户手动停止")
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)


@app.get("/api/sessions")
async def get_sessions_history(
    q: Optional[str] = None,
    date: Optional[str] = None,
    platform: Optional[str] = None,
):
    """
    获取历史会话列表，支持多维度筛选：
    - q: 按关键词模糊搜索
    - date: 按日期过滤（YYYY-MM-DD）
    - platform: 按平台过滤（支持 all）
    """
    summary_list: List[Dict[str, Any]] = []

    # 解析日期筛选参数
    target_date: Optional[datetime.date] = None
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            target_date = None

    query = (q or "").strip().lower()

    for session_id, session in manager.sessions.items():
        keyword = getattr(session, "keyword", "") or ""
        platform_value = getattr(session, "platform", "") or ""
        start_time = getattr(session, "start_time", None)

        # 1. 关键词模糊搜索（仅对 keyword）
        if query:
            if query not in keyword.lower():
                continue

        # 2. 平台精确筛选
        if platform and platform != "all" and platform_value != platform:
            continue

        # 3. 日期筛选（基于 start_time 时间戳）
        if target_date:
            if not start_time:
                continue
            session_date = datetime.fromtimestamp(start_time).date()
            if session_date != target_date:
                continue

        summary_list.append(
            {
                "session_id": session_id,
                "keyword": keyword,
                "platform": platform_value,
                "start_time": start_time,
                "crawled_count": session.crawled_count,
                "status": "running" if session.is_running else "stopped",
            }
        )

    # 按时间倒序排列（最新的在最上面）
    summary_list.sort(key=lambda item: item.get("start_time") or 0, reverse=True)

    return {"total": len(summary_list), "sessions": summary_list}


async def run_crawler_task(session_id: str, request: CrawlRequest):
    """优化版爬虫任务：状态与连接分离"""
    session = manager.get_session(session_id)

    if session.is_running:
        await manager.safe_emit(session_id, "⚠️ 任务已经在运行中，请勿重复启动。")
        return

    # 初始化会话状态
    session.is_running = True
    session.crawled_count = 0
    # 使用真实时间戳，便于前端展示
    session.start_time = time.time()
    session.error_message = None
    session.logs.clear()  # 新任务开始清空旧日志
    # 保存请求元数据，供历史接口使用
    session.keyword = request.keyword
    session.platform = request.platform
    session.request_count = request.count

    await manager.safe_emit(session_id, f"🚀 任务启动: {request.platform} - {request.keyword}")

    # 核心回调函数 - 注入到爬虫内核
    async def on_crawler_update(message: str, data_item: dict = None):
        """
        爬虫更新回调函数
        message: 日志文本
        data_item: 如果爬到了数据，传进来，用于计数
        """
        # 1. 处理日志
        if message:
            await manager.safe_emit(session_id, message)

        # 2. 处理计数 (如果传了 data_item 或者检测到特定关键词)
        if data_item or "保存成功" in message:
            await manager.increment_count(session_id)

        # 3. 发送实时数据更新
        if data_item:
            await manager.send_data_update(session_id, data_item)

    try:
        await manager.safe_emit(session_id, f"🔍 正在创建 {request.platform} 爬虫实例...")

        # 创建爬虫实例
        crawler_factory = CrawlerFactory()
        crawler: AbstractCrawler = crawler_factory.create_crawler(request.platform)

        await manager.safe_emit(session_id, f"✅ 爬虫实例创建成功: {type(crawler).__name__}")

        # 如果是小红书爬虫，使用优化的回调注入方式
        if isinstance(crawler, XiaoHongShuCrawler):
            await manager.safe_emit(session_id, "🔧 配置小红书爬虫实时数据流...")

            # 保存原始函数
            original_update_xhs_note = xhs_store.update_xhs_note

            # 优化的WebSocket数据发送函数
            async def update_xhs_note_with_websocket(note_item: Dict[str, Any]):
                # 立即发送实时数据
                await on_crawler_update(
                    f"📝 笔记 {note_item.get('note_id', 'N/A')} 数据获取成功",
                    data_item=note_item
                )

                # 异步执行原始存储操作，不阻塞爬虫
                try:
                    await original_update_xhs_note(note_item)
                except Exception as e:
                    await manager.safe_emit(session_id, f"⚠️ 数据存储异常: {e}")

            # 注入回调函数
            xhs_store.update_xhs_note = update_xhs_note_with_websocket

            try:
                # 设置爬虫类型
                crawler_type_var.set("search")

                await manager.safe_emit(session_id, "🚀 启动浏览器和爬虫任务...")
                await manager.set_status(session_id, True)

                # 执行爬虫任务
                await asyncio.wait_for(crawler.start(), timeout=600)  # 10分钟超时

                await manager.safe_emit(session_id, "✅ 爬虫任务执行完成")

            except asyncio.TimeoutError:
                await manager.set_status(session_id, False, "任务超时")
                await manager.safe_emit(session_id, "❌ 任务执行超时（10分钟）")
            except Exception as e:
                await manager.set_status(session_id, False, str(e))
                await manager.safe_emit(session_id, f"❌ 爬虫执行异常: {str(e)}")
                import traceback
                traceback.print_exc()
            finally:
                # 恢复原始函数
                xhs_store.update_xhs_note = original_update_xhs_note
                await manager.set_status(session_id, False)

        else:
            # 其他平台的处理逻辑
            await manager.safe_emit(session_id, f"🔄 启动 {request.platform} 平台爬虫...")
            await manager.set_status(session_id, True)

            crawler_type_var.set("search")
            await crawler.start()

            await manager.set_status(session_id, False)
            await manager.safe_emit(session_id, f"✅ {request.platform} 爬虫任务完成")

    except Exception as e:
        import traceback
        error_msg = f"💥 任务异常停止: {str(e)}"
        print(traceback.format_exc())

        await manager.set_status(session_id, False, error_msg)
        await manager.safe_emit(session_id, error_msg)

    finally:
        await manager.safe_emit(session_id, "🏁 任务结束")
        await manager.send_stat_update(session_id)


class CrawlerFactory:
    """Factory for creating platform-specific crawlers"""

    CRAWLERS = {
        "xhs": XiaoHongShuCrawler,
    }

    @staticmethod
    def create_crawler(platform: str) -> AbstractCrawler:
        crawler_class = CrawlerFactory.CRAWLERS.get(platform)
        if not crawler_class:
            raise ValueError(f"Unsupported platform: {platform}")
        return crawler_class()


@app.get("/api/crawl/history")
async def get_crawl_history():
    """Get crawling history from Redis cache"""
    try:
        if not manager.redis_client:
            return {"history": []}

        # Get last 10 crawl sessions
        sessions = await manager.redis_client.lrange("crawl_history", 0, 9)
        history = []

        for session in sessions:
            try:
                session_data = json.loads(session)
                history.append(session_data)
            except json.JSONDecodeError:
                continue

        return {"history": history}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get history: {str(e)}")


@app.get("/api/stats")
async def get_stats():
    """Get crawler statistics"""
    try:
        stats = {
            "active_connections": sum(len(session.active_sockets) for session in manager.sessions.values()),
            "total_sessions": len(manager.sessions),
            "platforms": list(CrawlerFactory.CRAWLERS.keys())
        }
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=3450,
        reload=True,
        log_level="info"
    )
