import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import type { Message } from '../types';

interface UseSocketOptions {
  onNewMessage?: (message: Message) => void;
}

export function useSocket(options?: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id);
  const currentRoomId = useChatStore((s) => s.currentRoomId);

  const addMessage = useChatStore((s) => s.addMessage);
  const deleteMessageFromStore = useChatStore((s) => s.deleteMessage);
  const markRoomRead = useChatStore((s) => s.markRoomRead);
  const updateUnread = useChatStore((s) => s.updateUnread);
  const setTyping = useChatStore((s) => s.setTyping);
  const setOnlineUsers = useChatStore((s) => s.setOnlineUsers);
  const updateRoomLastMessage = useChatStore((s) => s.updateRoomLastMessage);

  // 콜백을 ref에 저장하여 최신 상태 참조
  const onNewMessageRef = useRef(options?.onNewMessage);
  onNewMessageRef.current = options?.onNewMessage;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(window.location.origin, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('new_message', (message: Message) => {
      addMessage(message);
      updateRoomLastMessage(message.room_id, message.created_at);

      // 내가 보낸 메시지가 아닐 때만 알림
      if (message.sender_id !== userIdRef.current) {
        onNewMessageRef.current?.(message);
      }
    });

    socket.on('messages_read', ({ roomId }: { roomId: string }) => {
      markRoomRead(roomId);
    });

    socket.on('unread_update', ({ roomId, count }: { roomId: string; count: number }) => {
      updateUnread(roomId, count);
    });

    socket.on('typing', (data: { userId: string; userName: string; isTyping: boolean }) => {
      if (data.isTyping) {
        setTyping(currentRoomId || '', { userId: data.userId, userName: data.userName });
      } else {
        setTyping(currentRoomId || '', null);
      }
    });

    socket.on('message_deleted', ({ roomId, messageId }: { roomId: string; messageId: string }) => {
      deleteMessageFromStore(roomId, messageId);
    });

    socket.on('user_online', ({ onlineUsers: users }: { onlineUsers: string[] }) => {
      setOnlineUsers(users);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  const joinRoom = (roomId: string) => {
    socketRef.current?.emit('join_room', roomId);
  };

  const leaveRoom = (roomId: string) => {
    socketRef.current?.emit('leave_room', roomId);
  };

  const sendMessage = (roomId: string, content: string, messageType?: string) => {
    socketRef.current?.emit('send_message', { roomId, content, messageType });
  };

  const sendTyping = (roomId: string, isTyping: boolean) => {
    socketRef.current?.emit('typing', { roomId, isTyping });
  };

  const sendReadReceipt = (roomId: string) => {
    socketRef.current?.emit('read_receipt', { roomId });
  };

  const deleteMessage = (messageId: string) => {
    socketRef.current?.emit('delete_message', { messageId });
  };

  return { joinRoom, leaveRoom, sendMessage, sendTyping, sendReadReceipt, deleteMessage };
}
