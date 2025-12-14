import React from 'react';
import { useCrawlerStore } from '@/store/useCrawlerStore';
import { PlayCircle, StopCircle, Database, Activity, Clock, AlertCircle } from 'lucide-react';

export function StatusPanel() {
  const {
    crawledCount,
    isRunning,
    connectionStatus,
    logs
  } = useCrawlerStore();

  const getStatusIcon = () => {
    if (connectionStatus.status === 'error') {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    if (isRunning) {
      return <PlayCircle className="w-5 h-5 text-green-500" />;
    }
    return <StopCircle className="w-5 h-5 text-gray-500" />;
  };

  const getStatusText = () => {
    if (connectionStatus.status === 'error') {
      return '错误';
    }
    if (isRunning) {
      return '运行中';
    }
    return '已停止';
  };

  const getStatusColor = () => {
    if (connectionStatus.status === 'error') {
      return 'text-red-600 bg-red-50 border-red-200';
    }
    if (isRunning) {
      return 'text-green-600 bg-green-50 border-green-200';
    }
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* 连接状态 */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">连接状态</p>
            <div className="flex items-center gap-2 mt-1">
              {getStatusIcon()}
              <span className="text-lg font-semibold">{getStatusText()}</span>
            </div>
          </div>
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus.connected ? 'bg-green-500' : 'bg-gray-300'
          }`} />
        </div>
      </div>

      {/* 爬取数据量 */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">已爬取</p>
            <div className="flex items-center gap-2 mt-1">
              <Database className="w-5 h-5 text-blue-500" />
              <span className="text-lg font-semibold">{crawledCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 日志数量 */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">日志条数</p>
            <div className="flex items-center gap-2 mt-1">
              <Activity className="w-5 h-5 text-purple-500" />
              <span className="text-lg font-semibold">{logs.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 会话ID */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">会话状态</p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor()}`}>
                {connectionStatus.sessionId ? `已连接` : '未连接'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}