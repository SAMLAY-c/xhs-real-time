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
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import redis.asyncio as redis

# Add parent directory to Python path to import MediaCrawler modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# from cmd_arg import ArgumentParser
from config import base_config
from base.base_crawler import AbstractCrawler
from media_platform.xhs import XiaoHongShuCrawler
from var import crawler_type_var


class CrawlRequest(BaseModel):
    keyword: str
    count: int = 20
    platform: str = "xhs"


class CrawlResponse(BaseModel):
    success: bool
    message: str
    session_id: Optional[str] = None


class ConnectionManager:
    """WebSocket connection manager for real-time updates"""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
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

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
        print(f"✅ WebSocket connected for session: {session_id}")

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        print(f"❌ WebSocket disconnected for session: {session_id}")

    async def send_personal_message(self, message: Dict[str, Any], session_id: str):
        if session_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_text(json.dumps(message, ensure_ascii=False))
                except Exception as e:
                    print(f"❌ Error sending message: {e}")
                    disconnected.append(connection)

            # Clean up disconnected connections
            for conn in disconnected:
                self.active_connections[session_id].remove(conn)

    async def broadcast_to_all(self, message: Dict[str, Any]):
        """Broadcast message to all active connections"""
        for session_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_text(json.dumps(message, ensure_ascii=False))
                except Exception as e:
                    print(f"❌ Error broadcasting: {e}")


# Global connection manager
manager = ConnectionManager()


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
async def start_crawl(request: CrawlRequest):
    """Start crawling process and return session ID"""
    try:
        # Generate unique session ID
        import uuid
        session_id = str(uuid.uuid4())

        # Update global configuration
        base_config.KEYWORDS = request.keyword
        base_config.CRAWLER_MAX_NOTES_COUNT = request.count
        base_config.PLATFORM = request.platform
        base_config.CRAWLER_TYPE = "search"

        # Start crawling in background
        asyncio.create_task(run_crawler(session_id, request))

        return CrawlResponse(
            success=True,
            message=f"Started crawling for '{request.keyword}' on {request.platform}",
            session_id=session_id
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start crawling: {str(e)}")


@app.websocket("/ws/logs/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time log updates"""
    await manager.connect(websocket, session_id)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)


async def run_crawler(session_id: str, request: CrawlRequest):
    """Run the crawler in background and send updates via WebSocket"""
    try:
        await manager.send_personal_message({
            "type": "status",
            "status": "starting",
            "message": f"Starting crawler for keyword: {request.keyword}"
        }, session_id)

        # Create crawler instance
        crawler_factory = CrawlerFactory()
        crawler: AbstractCrawler = crawler_factory.create_crawler(request.platform)

        # Override crawler's data storage methods to send real-time updates
        original_save_data = crawler.context_store.save_content

        async def save_data_with_websocket(data: Dict[str, Any]):
            # Send real-time update
            await manager.send_personal_message({
                "type": "data",
                "data": data,
                "status": "success"
            }, session_id)

            # Call original save method
            await original_save_data(data)

        # Monkey patch the save method
        crawler.context_store.save_content = save_data_with_websocket

        # Send progress updates
        await manager.send_personal_message({
            "type": "status",
            "status": "running",
            "message": "Crawler is running..."
        }, session_id)

        # Run the crawler
        crawler_type_var.set("search")
        await crawler.start()

        await manager.send_personal_message({
            "type": "status",
            "status": "completed",
            "message": f"Crawling completed for keyword: {request.keyword}"
        }, session_id)

    except Exception as e:
        await manager.send_personal_message({
            "type": "status",
            "status": "error",
            "message": f"Crawling failed: {str(e)}"
        }, session_id)


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
            "active_connections": sum(len(conns) for conns in manager.active_connections.values()),
            "total_sessions": len(manager.active_connections),
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