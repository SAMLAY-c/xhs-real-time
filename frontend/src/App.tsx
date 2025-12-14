import { useEffect } from 'react';
import { CrawlerForm } from '@/components/CrawlerForm';
import { RealtimeTable } from '@/components/RealtimeTable';
import { LogViewer } from '@/components/LogViewer';
import { HistoryPanel } from '@/components/HistoryPanel';
import { useCrawlerStore, useWebSocketConnection } from '@/store/useCrawlerStore';

function App() {
  const { sessionId, setSessionId, crawledCount, connectionStatus } = useCrawlerStore();
  const { connect } = useWebSocketConnection();

  // 页面刷新后自动尝试恢复上一次会话
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedSessionId = window.localStorage.getItem('crawler_session_id');
    if (storedSessionId && !sessionId) {
      setSessionId(storedSessionId);
      connect(storedSessionId);
    }
  }, []);

  const handleResumeFromHistory = (id: string) => {
    setSessionId(id);
    connect(id);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">XHS</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold leading-tight">MediaCrawler Dashboard</h1>
                <span className="text-muted-foreground text-sm">
                  实时小红书数据采集界面 - 断点续传版
                </span>
              </div>
            </div>

            {/* 顶部精简状态条 */}
            <div className="hidden md:flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus.connected ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                />
                <span className="font-medium">
                  {connectionStatus.connected ? '已连接' : '未连接'}
                </span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                <span className="text-xs font-mono opacity-80">已爬取</span>
                <span className="font-semibold">{crawledCount}</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700">
                <span className="text-xs opacity-80">会话</span>
                <span className="font-mono text-xs">
                  {sessionId ? sessionId.slice(0, 8) : '未开始'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 flex-1 max-w-[1600px]">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-10rem)]">
          {/* 左侧：历史记录侧边栏 - 较窄导航列 */}
          <div className="xl:col-span-2 h-full">
            <HistoryPanel
              currentSessionId={sessionId}
              onResumeSession={handleResumeFromHistory}
            />
          </div>

          {/* 中间：主控制台区域（浅色背景 + 边框） */}
          <div className="xl:col-span-7 h-full">
            <div className="h-full bg-muted/40 border border-border/60 rounded-2xl shadow-sm px-5 py-4 flex flex-col gap-4">
              <div className="flex-none">
                <CrawlerForm />
              </div>
              <div className="flex-1 min-h-0">
                <RealtimeTable />
              </div>
            </div>
          </div>

          {/* 右侧：日志 - 适当宽度 */}
          <div className="xl:col-span-3 h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <LogViewer />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          <p>MediaCrawler Dashboard - 基于 Playwright 的多平台数据采集工具</p>
          <p className="text-xs mt-1">
            本工具仅供学习研究使用，请遵守相关平台的使用条款 | 支持断点续传和状态持久化
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
