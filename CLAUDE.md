# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MediaCrawler is a comprehensive social media data collection tool supporting multiple Chinese platforms (小红书, 抖音, 快手, B站, 微博, 贴吧, 知乎). The project features both a traditional CLI interface and a modern web dashboard with real-time monitoring capabilities. It uses Playwright for browser automation and maintains login states to bypass anti-crawling mechanisms without requiring JavaScript reverse engineering.

## Development Commands

### Web Dashboard (Recommended)
```bash
# Start backend FastAPI server on port 3450
cd backend && python3 server.py

# Start frontend React dashboard on port 5173
cd frontend && npm install && npm run dev

# Access dashboard: http://localhost:5173
# API docs: http://localhost:3450/docs
# WebSocket endpoint: ws://localhost:3450/ws/logs/{session_id}
```

### Traditional CLI
```bash
# Environment setup (with uv - recommended)
uv sync
uv run playwright install

# Run main crawler
uv run main.py --platform xhs --lt qrcode --type search

# Alternative: using Python venv
python -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate  # Windows
pip install -r requirements.txt
playwright install
python main.py --platform xhs --lt qrcode --type search
```

### Frontend Development
```bash
# Frontend build and linting
cd frontend
npm run build        # Build for production
npm run lint          # Run ESLint
npm run preview       # Preview production build
```

### Documentation
```bash
# Documentation (VitePress)
npm run docs:dev      # Development server
npm run docs:build    # Build documentation
npm run docs:preview  # Preview built docs
```

## Architecture

The project follows a **dual-interface architecture** with both CLI and web dashboard capabilities:

### Core Components

1. **CLI Entry Point**: [`main.py`](main.py) - Traditional command-line interface with CrawlerFactory pattern
2. **Web Dashboard**:
   - [`backend/server.py`](backend/server.py) - FastAPI server with WebSocket support (port 3450)
   - [`frontend/`](frontend/) - React 19 + TypeScript dashboard (port 5173)
3. **Platform Implementations**: [`media_platform/`](media_platform/) directory contains platform-specific crawlers
   - `xhs/` - 小红书 (XiaoHongShu) - Fully functional with web dashboard
   - `douyin/` - 抖音 - Basic implementation
   - `kuaishou/` - 快手 - Basic implementation
   - `bilibili/` - B站 - Basic implementation
   - `weibo/` - 微博 - Basic implementation
   - `tieba/` - 贴吧 - Basic implementation
   - `zhihu/` - 知乎 - Basic implementation

4. **Database Layer**: [`database/`](database/) directory with multiple storage backends
5. **Tools**: [`tools/`](tools/) directory for utilities (browser launching, CDP, etc.)
6. **Proxy**: [`proxy/`](proxy/) directory for IP proxy pool management

### Web Dashboard Architecture

**Backend (FastAPI + WebSocket)**:
- REST API: `/api/crawl/start` - Initialize crawling tasks with optional session_id
- WebSocket: `/ws/logs/{session_id}` - Real-time progress updates with session persistence
- **SessionManager**: State-connection separation supporting multi-tab monitoring
- **SessionData**: Persistent session state with log rotation (`deque(maxlen=500)`)
- **Callback Injection**: `on_crawler_update` function for real-time data streaming
- Factory pattern integration with existing crawler architecture
- Memory-safe operations with automatic cleanup of disconnected WebSocket clients

**Frontend (React 19 + TypeScript)**:
- Components: [`frontend/src/components/`](frontend/src/components/)
  - `CrawlerForm.tsx` - Search interface with session resume functionality
  - `RealtimeTable.tsx` - Live data display with sorting/expansion
  - `LogViewer.tsx` - Terminal-style real-time log display
  - `StatusPanel.tsx` - Connection and crawl status dashboard
- State Management: Zustand store with WebSocket, logs, and session persistence
- Session Recovery: Automatic localStorage-based session restoration on page refresh
- Real-time UI updates via structured WebSocket messaging
- Responsive design with Tailwind CSS

### Key Design Patterns

- **Factory Pattern**: `CrawlerFactory` creates platform-specific crawlers, used by both CLI and web interfaces
- **Abstract Base Class**: `AbstractCrawler` defines common interface for all platforms
- **Observer Pattern**: WebSocket connections receive real-time updates during crawling
- **Session Pattern**: State-connection separation with `SessionManager` for reliability
- **Strategy Pattern**: Multiple storage implementations (CSV, JSON, DB, Excel)
- **Dual Interface**: Same crawler core works for CLI and web dashboard

### Configuration System

The project uses a layered configuration approach:
- `config/base_config.py` - Common settings for all platforms
- `{platform}_config.py` - Platform-specific configurations
- Key settings include proxy options, crawler types, concurrency limits, and data storage preferences
- Web dashboard inherits all CLI configuration options

### Anti-Detection Features

- Browser automation with Playwright
- **CDP Mode**: Chrome DevTools Protocol for better anti-detection using user's existing browser
- IP proxy pool support with multiple provider integrations
- Login state caching (QR code, phone, cookie authentication)
- Configurable headless/headed browser modes
- Request timing and user agent rotation

### Data Collection Modes

- **search**: Keyword-based post discovery
- **detail**: Specific post ID collection
- **creator**: User profile data collection

### Real-time Features (Web Dashboard)

- **Enhanced WebSocket Architecture**: State-connection separation for improved reliability
- **Session Persistence**: Resume sessions after page refresh with `SessionManager`
- **Multi-tab Support**: Monitor same crawling session from multiple browser tabs
- **Memory Leak Protection**: Automatic log rotation with `deque(maxlen=500)`
- **Structured Messaging**: JSON-based communication for `stats`, `data`, and log messages
- **Automatic Reconnection**: Page refresh automatically restores previous session via localStorage
- **Real-time Table Updates**: High-performance table with sorting and row expansion
- **Live Log Viewer**: Terminal-style log display with auto-scroll
- **Status Dashboard**: Real-time connection status, crawl count, and session information

## Critical Architecture: Enhanced WebSocket System

The web dashboard features a robust WebSocket session management system that solves the "refresh disconnect" problem:

### SessionManager Pattern
- **State-Connection Separation**: `SessionData` maintains state independently of WebSocket connections
- **Multi-Tab Support**: Multiple `active_sockets` per session enable simultaneous monitoring
- **Automatic Recovery**: Page refresh reconnects to existing session via localStorage session_id
- **Memory Safety**: `deque(maxlen=500)` prevents unlimited log growth

### Message Types
- **Structured JSON**: `{"type": "stats"}`, `{"type": "data"}`, `{"type": "status"}`
- **Text Logs**: Plain text for historical log batches (session resume)
- **Ping/Pong**: Connection health monitoring

### Frontend Session Persistence
- **localStorage**: Automatic session_id storage and recovery
- **Zustand Store**: Centralized state for logs, data, and connection status
- **Smart Parsing**: Differentiates JSON vs text messages for optimal handling

### Key Files
- `backend/server.py:44-182` - SessionManager and SessionData classes
- `frontend/src/store/useCrawlerStore.ts:75-84` - localStorage session persistence
- `frontend/src/components/CrawlerForm.tsx:76-94` - Session resume functionality

## Development Notes

- Python 3.11+ required for backend
- Node.js 16+ required for frontend dashboard
- Uses `uv` as preferred package manager (Python equivalent of npm/yarn)
- Playwright handles browser automation and authentication
- Web dashboard provides real-time monitoring of CLI crawler execution
- Support for both local Chrome/Edge detection and custom browser paths
- Comprehensive logging and error handling throughout the codebase
- WebSocket connections enable live data streaming without polling
- Session persistence survives browser refreshes and connection interruptions
- Multi-tab support allows monitoring same crawl from multiple browser windows