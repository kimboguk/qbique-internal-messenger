export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ceo' | 'member';
  title?: string | null;
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
    title?: string | null;
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

// Document Management Types
export interface DocumentCategory {
  id: string;
  name: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface DocumentTag {
  id: string;
  name: string;
  created_at: string;
}

export interface FormTemplateField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  options?: string[];
  required?: boolean;
}

export interface FormTemplate {
  id: string;
  name: string;
  description?: string | null;
  category_id?: string | null;
  schema: { fields: FormTemplateField[] };
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  doc_type: 'freeform' | 'form';
  content: string | null;
  template_id: string | null;
  category_id: string | null;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  is_public: boolean;
  author_id: string;
  reviewed_by: string | null;
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  author_name?: string;
  author_email?: string;
  category_name?: string;
  reviewer_name?: string;
  author?: { id: string; name: string };
  category?: { id: string; name: string } | null;
  tags?: DocumentTag[];
  shares?: DocumentShare[];
  attachments?: DocumentAttachment[];
}

export interface DocumentShare {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
}

export interface DocumentAttachment {
  id: string;
  document_id: string;
  filename: string;
  filepath: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
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
