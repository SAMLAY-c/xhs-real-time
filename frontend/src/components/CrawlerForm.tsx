import React, { useState, useRef, useEffect } from 'react';
import { Play, Loader2, RotateCcw } from 'lucide-react';
import { useCrawlerStore, useWebSocketConnection } from '@/store/useCrawlerStore';
import { CrawlRequest } from '@/types';
import { cn } from '@/lib/utils';

export function CrawlerForm() {
  const [keyword, setKeyword] = useState('');
  const [count, setCount] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { connect, disconnect } = useWebSocketConnection();
  const {
    connectionStatus,
    isLoading,
    setSessionId,
    setLoading,
    clearSession
  } = useCrawlerStore();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!keyword.trim()) {
      alert('请输入搜索关键词');
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      const request: CrawlRequest = {
        keyword: keyword.trim(),
        count,
        platform: 'xhs',
      };

      const response = await fetch('/api/crawl/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();

      if (result.success && result.session_id) {
        setSessionId(result.session_id);

        // Connect WebSocket
        wsRef.current = connect(result.session_id);

        console.log('✅ Crawler started:', result.message);
      } else {
        throw new Error(result.message || 'Failed to start crawler');
      }
    } catch (error) {
      console.error('❌ Failed to start crawler:', error);
      alert(`启动爬虫失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setLoading(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStop = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    disconnect();
    clearSession();
    setLoading(false);
  };

  return (
    <div className="w-full bg-card rounded-lg border p-6 shadow-sm">
      {/* Status Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-3 h-3 rounded-full transition-colors",
            connectionStatus.connected ? "bg-green-500" : "bg-red-500"
          )} />
          <span className="text-sm font-medium">
            {connectionStatus.connected ? 'WebSocket 已连接' : 'WebSocket 未连接'}
          </span>
          {connectionStatus.status && (
            <span className="text-sm text-muted-foreground ml-2">
              ({connectionStatus.status})
            </span>
          )}
        </div>
        {connectionStatus.lastMessage && (
          <div className="text-sm text-muted-foreground truncate max-w-md">
            {connectionStatus.lastMessage}
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="输入搜索关键词..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full px-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isLoading || isSubmitting}
            />
          </div>

          <div className="w-full sm:w-32">
            <input
              type="number"
              placeholder="爬取数量"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 20)))}
              min="1"
              max="100"
              className="w-full px-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isLoading || isSubmitting}
            />
          </div>

          <div className="flex gap-2">
            {!isLoading ? (
              <button
                type="submit"
                disabled={isSubmitting || !keyword.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isSubmitting ? '启动中...' : '开始执行'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-2 px-6 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                停止
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>平台: 小红书 (XHS)</span>
          <span>•</span>
          <span>模式: 关键词搜索</span>
          <span>•</span>
          <span>最大数量: {count}</span>
        </div>
      </form>
    </div>
  );
}
