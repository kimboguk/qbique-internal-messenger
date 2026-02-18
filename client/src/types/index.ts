export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ceo' | 'member';
  is_active?: boolean;
  created_at?: string;
  last_seen_at?: string | null;
}

export interface ChatRoom {
  id: string;
  ceo_id: string;
  member_id: string;
  topic: 'operations' | 'feedback';
  created_at: string;
  last_message_at: string | null;
  other_user?: {
    id: string;
    name: string;
    email: string;
    is_active: boolean;
  };
  unread_count?: number;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'system';
  is_read: boolean;
  created_at: string;
  sender?: { id: string; name: string };
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  message_id: string;
  filename: string;
  filepath: string;
  file_type: string;
  file_size: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
