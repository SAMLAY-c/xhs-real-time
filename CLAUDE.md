# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MediaCrawler is a social media data collection tool that supports multiple Chinese platforms (小红书, 抖音, 快手, B站, 微博, 贴吧, 知乎). The project uses Playwright for browser automation and maintains login states to bypass anti-crawling mechanisms without requiring JavaScript reverse engineering.

## Development Commands

### Environment Setup (with uv - recommended)
```bash
# Install dependencies
uv sync

# Install browser drivers
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

### Testing
```bash
# Run tests (if available)
uv run pytest
```

### Documentation
```bash
# Documentation (VitePress)
npm run docs:dev      # Development server
npm run docs:build    # Build documentation
npm run docs:preview  # Preview built docs
```

## Architecture

### Core Components

1. **Entry Point**: [`main.py`](main.py) - Main script with CrawlerFactory pattern
2. **Configuration**: [`config/base_config.py`](config/base_config.py) - Base configuration with Chinese comments
3. **Platform Implementations**: [`media_platform/`](media_platform/) directory contains platform-specific crawlers
   - `xhs/` - 小红书 (XiaoHongShu)
   - `douyin/` - 抖音
   - `kuaishou/` - 快手
   - `bilibili/` - B站
   - `weibo/` - 微博
   - `tieba/` - 贴吧
   - `zhihu/` - 知乎

4. **Database Layer**: [`database/`](database/) directory with multiple storage backends
5. **Tools**: [`tools/`](tools/) directory for utilities (browser launching, CDP, etc.)
6. **Proxy**: [`proxy/`](proxy/) directory for IP proxy pool management

### Key Design Patterns

- **Factory Pattern**: `CrawlerFactory` creates platform-specific crawlers
- **Abstract Base Class**: `AbstractCrawler` defines common interface for all platforms
- **Login State Management**: Supports QR code, phone, and cookie authentication
- **CDP Mode**: Chrome DevTools Protocol for better anti-detection
- **Multiple Storage Options**: CSV, JSON, SQLite, MySQL, Excel support

### Configuration System

The project uses a layered configuration approach:
- `base_config.py` - Common settings for all platforms
- `{platform}_config.py` - Platform-specific configurations
- Key settings include proxy options, crawler types, concurrency limits, and data storage preferences

### Anti-Detection Features

- Browser automation with Playwright
- CDP (Chrome DevTools Protocol) mode using existing browser instances
- IP proxy pool support
- Login state caching
- Configurable headless/headed browser modes
- Custom browser path support

### Data Collection Modes

- **search**: Keyword-based post discovery
- **detail**: Specific post ID collection
- **creator**: User profile data collection

## Development Notes

- Python 3.11+ required
- Node.js >= 16.0.0 required for some platforms
- Uses `uv` as preferred package manager (Python equivalent of npm/yarn)
- Playwright handles browser automation and authentication
- Support for both local Chrome/Edge detection and custom browser paths
- Comprehensive logging and error handling throughout the codebase