import React, { useState, useRef, useEffect } from 'react';
import { Play, Loader2, RotateCcw, RefreshCw, Link } from 'lucide-react';
import { useCrawlerStore, useWebSocketConnection } from '@/store/useCrawlerStore';
import { CrawlRequest } from '@/types';
import { cn } from '@/lib/utils';

export function CrawlerForm() {
  const [keyword, setKeyword] = useState('');
  const [count, setCount] = useState(20);
  const [sessionIdInput, setSessionIdInput] = useState('');
  const [showResume, setShowResume] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { connect, disconnect } = useWebSocketConnection();
  const {
    connectionStatus,
    isLoading,
    sessionId,
    setSessionId,
    setLoading,
    clearSession,
    isRunning
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
        session_id: undefined, // 新任务不指定session_id，让后端生成
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

  const handleResume = async () => {
    if (!sessionIdInput.trim()) {
      alert('请输入会话ID');
      return;
    }

    try {
      // 直接连接到现有会话的WebSocket
      setSessionId(sessionIdInput.trim());
      wsRef.current = connect(sessionIdInput.trim());

      console.log('✅ Connected to existing session:', sessionIdInput.trim());
      setShowResume(false);
      setSessionIdInput('');
    } catch (error) {
      console.error('❌ Failed to resume session:', error);
      alert(`恢复会话失败: ${error instanceof Error ? error.message : '未知错误'}`);
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
    <div className="w-full bg-card rounded-lg border p-5 shadow-sm">
      {/* Status Bar - 更紧凑的设计 */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full transition-colors",
            connectionStatus.connected ? "bg-green-500" : "bg-destructive"
          )} />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {connectionStatus.connected ? 'WebSocket 已连接' : 'WebSocket 未连接'}
            </span>
            {sessionId && (
              <span className="text-xs px-2 py-0.5 bg-muted rounded-md font-mono">
                {sessionId.slice(0, 8)}...
              </span>
            )}
          </div>
        </div>

        {/* 恢复会话按钮 - 移到右上角 */}
        <div className="flex items-center gap-2">
          {!showResume ? (
            <button
              type="button"
              onClick={() => setShowResume(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-xs"
            >
              <Link className="w-3.5 h-3.5" />
              恢复会话
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="会话ID..."
                value={sessionIdInput}
                onChange={(e) => setSessionIdInput(e.target.value)}
                className="w-32 px-2 py-1.5 border border-input bg-background rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleResume}
                disabled={!sessionIdInput.trim()}
                className="flex items-center gap-1 px-2 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
              >
                <RefreshCw className="w-3 h-3" />
                恢复
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResume(false);
                  setSessionIdInput('');
                }}
                className="px-2 py-1.5 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-xs"
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Form - 更简洁的布局 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索关键词..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full px-4 py-2.5 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isLoading || isSubmitting}
            />
          </div>

          <div className="w-24">
            <input
              type="number"
              placeholder="数量"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 20)))}
              min="1"
              max="100"
              className="w-full px-3 py-2.5 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-center"
              disabled={isLoading || isSubmitting}
            />
          </div>

          <div className="flex gap-2">
            {!isLoading ? (
              <button
                type="submit"
                disabled={isSubmitting || !keyword.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isSubmitting ? '启动中' : '开始执行'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-2 px-5 py-2.5 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                停止
              </button>
            )}
          </div>
        </div>

        {/* 底部信息栏 */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-medium">XHS</span>
            <span>关键词搜索</span>
            <span>•</span>
            <span>最大: {count}</span>
          </div>

          {isRunning && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span>运行中</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
