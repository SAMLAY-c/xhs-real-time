import React, { useEffect, useRef } from 'react';
import { useCrawlerStore } from '@/store/useCrawlerStore';

export function LogViewer() {
  const { logs, autoScroll } = useCrawlerStore();
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      const container = logContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [logs, autoScroll]);

  return (
    <div className="bg-card rounded-lg border shadow-sm h-full flex flex-col">
      {/* Log Header */}
      <div className="p-4 border-b flex items-center justify-between bg-muted/20">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>实时日志</span>
          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-sm font-mono">
            {logs.length} 条
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={() => {
                const store = useCrawlerStore.getState();
                store.toggleAutoScroll();
              }}
              className="rounded border-input"
            />
            <span>自动滚动</span>
          </label>
        </div>
      </div>

      {/* Log Container */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto bg-slate-900 text-green-400 font-mono text-sm p-4"
      >
        {logs.map((log, index) => (
          <div key={index} className="mb-1 leading-relaxed text-green-400">
            <span className="text-green-600 opacity-70">
              [{new Date(index === logs.length - 1 ? Date.now() : Date.now() - (logs.length - index) * 1000).toLocaleTimeString()}]
            </span>{' '}
            <span className="text-green-300">{log}</span>
          </div>
        ))}

        {logs.length === 0 && (
          <div className="text-center py-12 text-slate-500 h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <p className="text-lg font-medium">等待日志</p>
            <p className="text-sm mt-1">爬虫启动后将显示实时日志</p>
          </div>
        )}
      </div>
    </div>
  );
}