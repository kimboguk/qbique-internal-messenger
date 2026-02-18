import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { ChatRoomModel } from '../models/chatRoom';
import { MessageModel } from '../models/message';
import { UserModel } from '../models/user';
import db from '../db';

interface AuthSocket extends Socket {
  userId?: string;
  userRole?: 'ceo' | 'member';
  userName?: string;
}

// 온라인 사용자 추적: userId → Set<socketId>
const onlineUsers = new Map<string, Set<string>>();

export function setupSocketHandlers(io: Server) {
  // JWT 인증 미들웨어
  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('인증 토큰이 필요합니다.'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        id: string;
        role: 'ceo' | 'member';
        email: string;
      };
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('유효하지 않은 토큰입니다.'));
    }
  });

  io.on('connection', async (socket: AuthSocket) => {
    const userId = socket.userId!;
    console.log(`User connected: ${userId} (socket: ${socket.id})`);

    // 온라인 상태 등록
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // 사용자 이름 로드
    const user = await UserModel.findById(userId);
    if (user) {
      socket.userName = user.name;
      await UserModel.updateLastSeen(userId);
    }

    // 온라인 상태 브로드캐스트
    io.emit('user_online', {
      userId,
      online: true,
      onlineUsers: Array.from(onlineUsers.keys()),
    });

    // === 채팅방 입장 ===
    socket.on('join_room', async (roomId: string) => {
      const room = await ChatRoomModel.findById(roomId);
      if (!room) return;

      // 접근 권한 확인
      if (room.ceo_id !== userId && room.member_id !== userId) return;

      socket.join(roomId);

      // 읽음 처리
      const readCount = await MessageModel.markAsRead(roomId, userId);
      if (readCount > 0) {
        socket.to(roomId).emit('messages_read', { roomId, readerId: userId });
      }

      console.log(`User ${userId} joined room ${roomId}`);
    });

    // === 채팅방 퇴장 ===
    socket.on('leave_room', (roomId: string) => {
      socket.leave(roomId);
      console.log(`User ${userId} left room ${roomId}`);
    });

    // === 메시지 전송 ===
    socket.on('send_message', async (data: {
      roomId: string;
      content: string;
      messageType?: 'text' | 'file' | 'system';
    }) => {
      const { roomId, content, messageType } = data;

      if (!content || !roomId) return;

      // 채팅방 접근 권한 확인
      const room = await ChatRoomModel.findById(roomId);
      if (!room) return;
      if (room.ceo_id !== userId && room.member_id !== userId) return;

      // 메시지 저장
      const message = await MessageModel.create({
        room_id: roomId,
        sender_id: userId,
        content,
        message_type: messageType || 'text',
      });

      // 채팅방 마지막 메시지 시간 업데이트
      await ChatRoomModel.updateLastMessage(roomId);

      // 발신자 정보 포함하여 전송
      const messageWithSender = {
        ...message,
        sender: { id: userId, name: socket.userName },
        attachments: [],
      };

      // 해당 채팅방의 모든 참여자에게 전송
      io.to(roomId).emit('new_message', messageWithSender);

      // 채팅방에 없는 상대방에게도 알림 (unread count 업데이트용)
      const otherUserId = room.ceo_id === userId ? room.member_id : room.ceo_id;
      const otherSockets = onlineUsers.get(otherUserId);
      if (otherSockets) {
        const unreadCount = await MessageModel.getUnreadCount(roomId, otherUserId);
        otherSockets.forEach((sid) => {
          io.to(sid).emit('unread_update', { roomId, count: unreadCount });
        });
      }
    });

    // === 메시지 삭제 ===
    socket.on('delete_message', async (data: { messageId: string }) => {
      const { messageId } = data;
      if (!messageId) return;

      // 메시지 조회 (room 접근 권한 + 본인 확인)
      const message = await MessageModel.findById(messageId);
      if (!message) return;
      if (message.sender_id !== userId) return;

      const room = await ChatRoomModel.findById(message.room_id);
      if (!room) return;
      if (room.ceo_id !== userId && room.member_id !== userId) return;

      const deleted = await MessageModel.deleteMessage(messageId, userId);
      if (deleted) {
        io.to(message.room_id).emit('message_deleted', {
          messageId,
          roomId: message.room_id,
        });
      }
    });

    // === 타이핑 인디케이터 ===
    socket.on('typing', (data: { roomId: string; isTyping: boolean }) => {
      socket.to(data.roomId).emit('typing', {
        userId,
        userName: socket.userName,
        isTyping: data.isTyping,
      });
    });

    // === 읽음 확인 ===
    socket.on('read_receipt', async (data: { roomId: string }) => {
      const readCount = await MessageModel.markAsRead(data.roomId, userId);
      if (readCount > 0) {
        socket.to(data.roomId).emit('messages_read', {
          roomId: data.roomId,
          readerId: userId,
        });
      }
    });

    // === 연결 해제 ===
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId} (socket: ${socket.id})`);

      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user_online', {
            userId,
            online: false,
            onlineUsers: Array.from(onlineUsers.keys()),
          });
        }
      }

      UserModel.updateLastSeen(userId);
    });
  });
}
