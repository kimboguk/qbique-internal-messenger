import { create } from 'zustand';
import type { ChatRoom, Message } from '../types';

interface ChatState {
  rooms: ChatRoom[];
  currentRoomId: string | null;
  messages: Record<string, Message[]>; // roomId → messages
  hasMore: Record<string, boolean>;
  typingUsers: Record<string, { userId: string; userName: string } | null>;
  onlineUsers: string[];

  setRooms: (rooms: ChatRoom[]) => void;
  setCurrentRoom: (roomId: string | null) => void;
  setMessages: (roomId: string, messages: Message[], hasMore: boolean) => void;
  prependMessages: (roomId: string, messages: Message[], hasMore: boolean) => void;
  addMessage: (message: Message) => void;
  markRoomRead: (roomId: string) => void;
  updateUnread: (roomId: string, count: number) => void;
  setTyping: (roomId: string, data: { userId: string; userName: string } | null) => void;
  deleteMessage: (roomId: string, messageId: string) => void;
  setOnlineUsers: (users: string[]) => void;
  updateRoomLastMessage: (roomId: string, timestamp: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  currentRoomId: null,
  messages: {},
  hasMore: {},
  typingUsers: {},
  onlineUsers: [],

  setRooms: (rooms) => set({ rooms }),

  setCurrentRoom: (roomId) => set({ currentRoomId: roomId }),

  setMessages: (roomId, messages, hasMore) =>
    set((state) => ({
      messages: { ...state.messages, [roomId]: messages },
      hasMore: { ...state.hasMore, [roomId]: hasMore },
    })),

  prependMessages: (roomId, newMessages, hasMore) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: [...newMessages, ...(state.messages[roomId] || [])],
      },
      hasMore: { ...state.hasMore, [roomId]: hasMore },
    })),

  addMessage: (message) =>
    set((state) => {
      const roomMessages = state.messages[message.room_id] || [];
      return {
        messages: {
          ...state.messages,
          [message.room_id]: [...roomMessages, message],
        },
      };
    }),

  markRoomRead: (roomId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: (state.messages[roomId] || []).map((m) => ({ ...m, is_read: true })),
      },
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, unread_count: 0 } : r
      ),
    })),

  updateUnread: (roomId, count) =>
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, unread_count: count } : r
      ),
    })),

  setTyping: (roomId, data) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [roomId]: data },
    })),

  deleteMessage: (roomId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: (state.messages[roomId] || []).filter((m) => m.id !== messageId),
      },
    })),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  updateRoomLastMessage: (roomId, timestamp) =>
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, last_message_at: timestamp } : r
      ),
    })),
}));
