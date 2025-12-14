# MediaCrawler Dashboard

一个现代化的 Web UI 管理界面，用于实时监控 MediaCrawler 爬虫数据采集过程。

## 功能特性

- 🚀 **实时数据流**: WebSocket 实时推送爬取到的数据
- 🎯 **关键词搜索**: 支持自定义关键词和爬取数量
- 📊 **数据可视化**: 高性能表格展示，支持排序和展开详情
- 🎨 **现代化界面**: 基于 Tailwind CSS 的响应式设计
- ⚡ **状态监控**: 实时显示爬虫运行状态和连接状态
- 🔧 **一键启动**: 将命令行操作转化为可视化界面

## 技术栈

### 后端
- Python FastAPI - Web 框架
- WebSocket - 实时通信
- Redis - 缓存 (可选)
- Pydantic - 数据验证

### 前端
- React 19 - UI 框架
- TypeScript - 类型安全
- Vite - 构建工具
- Tailwind CSS - 样式框架
- Zustand - 状态管理
- TanStack Table - 高性能表格

## 快速开始

### 环境要求

- Python 3.11+
- Node.js 16+
- Redis (可选，用于缓存)

### 安装依赖

```bash
# 后端依赖
cd backend
pip install -r ../../requirements.txt  # 使用项目根目录的依赖

# 前端依赖
cd ../frontend
npm install
```

### 启动服务

```bash
# 1. 启动后端 API 服务
cd backend
python server.py

# 2. 启动前端开发服务器 (新终端)
cd frontend
npm run dev
```

### 访问应用

- 前端界面: http://localhost:5173
- 后端 API: http://localhost:3450
- API 文档: http://localhost:3450/docs

## 使用指南

1. **启动爬虫**:
   - 在控制面板中输入搜索关键词
   - 设置爬取数量 (建议 20-100)
   - 点击 "开始执行" 按钮

2. **监控数据**:
   - 表格会实时显示爬取到的数据
   - 可以点击封面图片查看 JSON 原始数据
   - 支持按点赞数等字段排序

3. **状态监控**:
   - 顶部状态栏显示 WebSocket 连接状态
   - 实时显示爬虫运行状态和消息

## API 接口

### POST /api/crawl/start
启动爬虫任务

**请求体**:
```json
{
  "keyword": "职场加分行为",
  "count": 20,
  "platform": "xhs"
}
```

**响应**:
```json
{
  "success": true,
  "message": "Started crawling for '职场加分行为' on xhs",
  "session_id": "uuid-string"
}
```

### WebSocket /ws/logs/{session_id}
实时数据推送

**消息格式**:
```json
{
  "type": "status | data | error",
  "status": "starting | running | completed | error",
  "message": "状态描述",
  "data": {
    "note_id": "6912bce1000000000301183f",
    "title": "一些让我工作更顺的小习惯2.0",
    "nickname": "知行upup",
    "liked_count": "4623",
    "note_url": "https://www.xiaohongshu.com/...",
    "image_list": "http://sns-webpic-qc.xhscdn.com/..."
  }
}
```

## 项目结构

```
backend/
├── server.py              # FastAPI 服务器
└── requirements.txt       # Python 依赖

frontend/
├── src/
│   ├── components/
│   │   ├── CrawlerForm.tsx    # 爬虫控制表单
│   │   └── RealtimeTable.tsx  # 实时数据表格
│   ├── store/
│   │   └── useCrawlerStore.ts # Zustand 状态管理
│   ├── types/
│   │   └── index.ts           # TypeScript 类型定义
│   ├── lib/
│   │   └── utils.ts           # 工具函数
│   ├── App.tsx                # 主应用组件
│   └── main.tsx               # 应用入口
├── package.json              # 前端依赖
├── vite.config.ts            # Vite 配置
├── tailwind.config.js        # Tailwind CSS 配置
└── tsconfig.json             # TypeScript 配置
```

## 开发说明

### 添加新平台支持

1. 在 `backend/server.py` 的 `CrawlerFactory.CRAWLERS` 中添加新平台
2. 更新前端 `CrawlRequest` 类型的 platform 字段
3. 在前端界面添加平台选择器

### 扩展数据字段

1. 在 `frontend/src/types/index.ts` 中扩展 `CrawlPost` 接口
2. 在 `RealtimeTable.tsx` 的 columns 中添加新的表格列

### 自定义样式

项目使用 Tailwind CSS，主要配色方案：
- 主色: XiaoHongShu Red (#FF2442)
- 背景: Clean Slate (#F8FAFC) / Dark Mode (#0F172A)
- 状态色: Success Green / Processing Blue / Error Red

## 注意事项

- 本工具仅供学习和研究使用
- 请遵守目标平台的使用条款和 robots.txt 规则
- 合理控制爬取频率，避免给平台造成负担
- 不得用于任何商业用途或非法活动