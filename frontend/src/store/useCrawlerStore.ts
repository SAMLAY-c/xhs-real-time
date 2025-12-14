import { create } from 'zustand';
import { CrawlPost, ConnectionStatus, WebSocketMessage } from '@/types';

interface CrawlerStore {
  // State
  posts: CrawlPost[];
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  autoScroll: boolean;
  sessionId: string | null;

  // Actions
  setPosts: (posts: CrawlPost[]) => void;
  addPost: (post: CrawlPost) => void;
  updateConnectionStatus: (status: Partial<ConnectionStatus>) => void;
  setLoading: (loading: boolean) => void;
  toggleAutoScroll: () => void;
  setSessionId: (sessionId: string | null) => void;
  clearPosts: () => void;
  clearSession: () => void;
}

export const useCrawlerStore = create<CrawlerStore>((set) => ({
  // Initial state
  posts: [],
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

  updateConnectionStatus: (status) => set((state) => ({
    connectionStatus: { ...state.connectionStatus, ...status },
  })),

  setLoading: (loading) => set({ isLoading: loading }),

  toggleAutoScroll: () => set((state) => ({
    autoScroll: !state.autoScroll,
  })),

  setSessionId: (sessionId) => set({ sessionId }),

  clearPosts: () => set({ posts: [] }),

  clearSession: () => set({
    posts: [],
    sessionId: null,
    connectionStatus: {
      connected: false,
    },
  }),
}));

// WebSocket connection hook
export const useWebSocketConnection = () => {
  const {
    sessionId,
    updateConnectionStatus,
    addPost,
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
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'status':
              updateConnectionStatus({
                status: message.status,
                lastMessage: message.message,
              });
              break;

            case 'data':
              if (message.data) {
                addPost(message.data);
              }
              break;

            case 'error':
              updateConnectionStatus({
                status: 'error',
                lastMessage: message.message,
              });
              break;
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
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
