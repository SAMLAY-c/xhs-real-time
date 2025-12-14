import { CrawlerForm } from '@/components/CrawlerForm';
import { RealtimeTable } from '@/components/RealtimeTable';

function App() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">XHS</span>
            </div>
            <h1 className="text-2xl font-bold">MediaCrawler Dashboard</h1>
            <span className="text-muted-foreground">实时小红书数据采集界面</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Control Panel */}
        <div>
          <h2 className="text-lg font-semibold mb-4">控制面板</h2>
          <CrawlerForm />
        </div>

        {/* Data Table */}
        <div>
          <RealtimeTable />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          <p>MediaCrawler Dashboard - 基于 Playwright 的多平台数据采集工具</p>
          <p className="text-xs mt-1">
            本工具仅供学习研究使用，请遵守相关平台的使用条款
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
