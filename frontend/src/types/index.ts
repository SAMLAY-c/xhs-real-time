export interface CrawlPost {
  note_id: string;
  title: string;
  nickname: string;
  liked_count: string;
  collected_count?: string;
  comment_count?: string;
  share_count?: string;
  note_url: string;
  image_list: string;
  avatar?: string;
  time: string;
  ip_location?: string;
  tags?: string[];
}

export interface CrawlRequest {
  keyword: string;
  count: number;
  platform: string;
}

export interface CrawlResponse {
  success: boolean;
  message: string;
  session_id?: string;
}

export interface WebSocketMessage {
  type: 'status' | 'data' | 'error';
  status?: 'starting' | 'running' | 'completed' | 'error';
  message?: string;
  data?: CrawlPost;
}

export interface ConnectionStatus {
  connected: boolean;
  sessionId?: string;
  status?: WebSocketMessage['status'];
  lastMessage?: string;
}