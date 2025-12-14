import { create } from 'zustand';
import { CrawlPost, ConnectionStatus, WebSocketMessage } from '@/types';

const SESSION_STORAGE_KEY = 'crawler_session_id';

interface CrawlerStore {
  // State
  posts: CrawlPost[];
  logs: string[];
  crawledCount: number;
  isRunning: boolean;
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  autoScroll: boolean;
  sessionId: string | null;

  // Actions
  setPosts: (posts: CrawlPost[]) => void;
  addPost: (post: CrawlPost) => void;
  addLogs: (logs: string[]) => void;
  addLog: (log: string) => void;
  updateStats: (count: number, isRunning: boolean) => void;
  updateConnectionStatus: (status: Partial<ConnectionStatus>) => void;
  setLoading: (loading: boolean) => void;
  toggleAutoScroll: () => void;
  setSessionId: (sessionId: string | null) => void;
  clearPosts: () => void;
  clearLogs: () => void;
  clearSession: () => void;
}

export const useCrawlerStore = create<CrawlerStore>((set) => ({
  // Initial state
  posts: [],
  logs: [],
  crawledCount: 0,
  isRunning: false,
  connectionStatus: {
    connected: false,
  },
  isLoading: false,
  autoScroll: true,
  sessionId: null,

  // Actions
  setPosts: (posts) => set({ posts }),

  addPost: (post) => set((state) => ({
    posts: [...state.posts, post],
  })),

  addLogs: (logs) => set((state) => ({
    logs: [...state.logs, ...logs],
  })),

  addLog: (log) => set((state) => ({
    logs: [...state.logs, log],
  })),

  updateStats: (count, isRunning) => set({
    crawledCount: count,
    isRunning: isRunning,
  }),

  updateConnectionStatus: (status) => set((state) => ({
    connectionStatus: { ...state.connectionStatus, ...status },
  })),

  setLoading: (loading) => set({ isLoading: loading }),

  toggleAutoScroll: () => set((state) => ({
    autoScroll: !state.autoScroll,
  })),

  setSessionId: (sessionId) => {
    if (typeof window !== 'undefined') {
      if (sessionId) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      } else {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
    return { sessionId };
  },

  clearPosts: () => set({ posts: [] }),

  clearLogs: () => set({ logs: [] }),

  clearSession: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    return {
      posts: [],
      logs: [],
      crawledCount: 0,
      isRunning: false,
      sessionId: null,
      connectionStatus: {
        connected: false,
      },
    };
  },
}));

// WebSocket connection hook
export const useWebSocketConnection = () => {
  const {
    sessionId,
    updateConnectionStatus,
    addPost,
    addLogs,
    addLog,
    updateStats,
  } = useCrawlerStore();

  const connect = (newSessionId: string): WebSocket | null => {
    if (sessionId) {
      disconnect();
    }

    try {
      const wsUrl = `ws://localhost:3450/ws/logs/${newSessionId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        updateConnectionStatus({
          connected: true,
          sessionId: newSessionId,
        });
      };

      ws.onmessage = (event) => {
        try {
          // 首先尝试解析为JSON，处理结构化消息
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'status':
              updateConnectionStatus({
                status: data.status,
                lastMessage: data.message,
              });
              break;

            case 'data':
              if (data.data) {
                addPost(data.data);
              }
              break;

            case 'stats':
              updateStats(data.crawled_count, data.status === 'running');
              updateConnectionStatus({
                status: data.status,
                lastMessage: data.error_message,
              });
              break;

            case 'error':
              updateConnectionStatus({
                status: 'error',
                lastMessage: data.message,
              });
              break;

            default:
              // 未知消息类型，作为日志处理
              addLog(JSON.stringify(data));
              break;
          }
        } catch (error) {
          // JSON解析失败，说明是纯文本日志
          if (typeof event.data === 'string') {
            // 检查是否包含换行符，可能是历史日志批量发送
            if (event.data.includes('\n')) {
              const historyLines = event.data.split('\n').filter(line => line.trim());
              addLogs(historyLines);
            } else {
              addLog(event.data);
            }
          } else {
            console.error('❌ Unexpected WebSocket message type:', typeof event.data);
          }
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        updateConnectionStatus({
          connected: false,
          status: 'error',
          lastMessage: 'Connection error',
        });
      };

      ws.onclose = () => {
        console.log('❌ WebSocket disconnected');
        updateConnectionStatus({
          connected: false,
          status: undefined,
        });
      };

      return ws;
    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error);
      updateConnectionStatus({
        connected: false,
        status: 'error',
        lastMessage: 'Failed to connect',
      });
    }
    return null;
  };

  const disconnect = () => {
    // WebSocket cleanup handled by the component
    updateConnectionStatus({
      connected: false,
      sessionId: undefined,
      status: undefined,
    });
  };

  return {
    connect,
    disconnect,
  };
};
