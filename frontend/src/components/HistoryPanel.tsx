import React, { useState, useEffect } from 'react';

interface SessionSummary {
  session_id: string;
  keyword: string;
  platform: string;
  start_time: number;
  crawled_count: number;
  status: string;
}

interface HistoryPanelProps {
  currentSessionId: string | null;
  onResumeSession: (sessionId: string) => void;
}

const PLATFORMS = [
  { value: 'all', label: '全部平台' },
  { value: 'xhs', label: '小红书' },
  { value: 'douyin', label: '抖音' },
  { value: 'kuaishou', label: '快手' },
  { value: 'bilibili', label: 'B站' },
  { value: 'weibo', label: '微博' },
];

export function HistoryPanel({ currentSessionId, onResumeSession }: HistoryPanelProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // 筛选状态
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  // 获取数据
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (selectedDate) params.append('date', selectedDate);
      if (selectedPlatform && selectedPlatform !== 'all') params.append('platform', selectedPlatform);

      const res = await fetch(`/api/sessions?${params.toString()}`);
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setLoading(false);
    }
  };

  // 监听筛选变化，自动刷新
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchHistory();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedDate, selectedPlatform]);

  return (
    <div className="bg-card rounded-lg border h-full flex flex-col overflow-hidden shadow-sm">
      {/* 头部区域：固定显示 */}
      <div className="p-4 border-b bg-muted/30">
        <h3 className="text-base font-bold mb-3 flex items-center gap-2">
          <span className="text-lg">📜</span>
          <span>历史记录</span>
        </h3>

        <div className="space-y-3">
          {/* 关键词搜索 */}
          <div className="relative group">
            <input
              type="text"
              placeholder="搜索关键词..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md text-sm transition-all focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <span className="absolute left-3 top-2.5 text-muted-foreground group-focus-within:text-primary">
              🔍
            </span>
          </div>

          {/* 日期与平台筛选 */}
          <div className="flex gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1.5 bg-background border border-input rounded-md text-xs focus:ring-1 focus:ring-primary focus:border-primary"
            />
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1.5 bg-background border border-input rounded-md text-xs focus:ring-1 focus:ring-primary focus:border-primary"
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-background/50">
        {sessions.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
            <span className="text-2xl mb-2">📭</span>
            <span>暂无相关记录</span>
          </div>
        )}

        {sessions.map((session) => (
          <div
            key={session.session_id}
            onClick={() => onResumeSession(session.session_id)}
            className={`group relative p-3 bg-card border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary ${
              currentSessionId === session.session_id
                ? 'border-primary ring-1 ring-primary/20 shadow-sm z-10 bg-primary/5'
                : 'border-border hover:bg-accent'
            }`}
          >
            {/* 列表项内容 */}
            <div className="flex justify-between items-start mb-2">
              <span
                className="font-medium text-foreground text-sm truncate pr-2 flex-1"
                title={session.keyword}
              >
                {session.keyword || '未命名任务'}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  session.platform === 'xhs'
                    ? 'bg-red-100 text-red-700'
                    : session.platform === 'douyin'
                    ? 'bg-gray-900 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {session.platform.toUpperCase()}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  🕒 {new Date(session.start_time * 1000).toLocaleDateString()}
                </span>
                <span>•</span>
                <span>{new Date(session.start_time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div className="flex items-center gap-2">
                {session.status === 'running' && (
                  <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    运行中
                  </div>
                )}
                <div className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  {session.crawled_count}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
