import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ChatRoomModel } from '../models/chatRoom';
import { MessageModel } from '../models/message';
import db from '../db';

const router = Router();

// GET /api/rooms — 내 채팅방 목록
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rooms = await ChatRoomModel.findByUser(req.user!.id, req.user!.role);

    // 채팅방에 상대방 이름 포함
    const roomsWithNames = await Promise.all(
      rooms.map(async (room) => {
        const otherUserId = req.user!.role === 'ceo' ? room.member_id : room.ceo_id;
        const otherUser = await db('users')
          .where({ id: otherUserId })
          .select('id', 'name', 'email', 'title', 'is_active')
          .first();

        // 안읽은 메시지 수
        const unreadCount = await db('messages')
          .where({ room_id: room.id, is_read: false, is_deleted: false })
          .whereNot({ sender_id: req.user!.id })
          .count('id as count')
          .first();

        return {
          ...room,
          other_user: otherUser,
          unread_count: parseInt(String(unreadCount?.count || '0'), 10),
        };
      })
    );

    res.json(roomsWithNames);
  } catch (err) {
    console.error('List rooms error:', err);
    res.status(500).json({ error: '채팅방 목록 조회 중 오류가 발생했습니다.' });
  }
});

// GET /api/rooms/:id/messages — 채팅방 메시지 조회 (페이징)
router.get('/:id/messages', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string; // cursor: created_at ISO string

    // 채팅방 접근 권한 확인
    const room = await ChatRoomModel.findById(id);
    if (!room) {
      res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' });
      return;
    }

    const isParticipant = room.ceo_id === req.user!.id || room.member_id === req.user!.id;
    if (!isParticipant) {
      res.status(403).json({ error: '이 채팅방에 접근할 수 없습니다.' });
      return;
    }

    let query = db('messages')
      .where({ room_id: id, is_deleted: false })
      .orderBy('created_at', 'desc')
      .limit(limit);

    if (before) {
      query = query.where('created_at', '<', before);
    }

    const messages = await query;

    // 발신자 정보 추가
    const messagesWithSender = await Promise.all(
      messages.map(async (msg) => {
        const sender = await db('users')
          .where({ id: msg.sender_id })
          .select('id', 'name')
          .first();

        // 첨부파일 정보
        const attachments = await db('attachments')
          .where({ message_id: msg.id });

        return {
          ...msg,
          sender,
          attachments,
        };
      })
    );

    res.json({
      messages: messagesWithSender.reverse(), // 시간순 정렬
      has_more: messages.length === limit,
    });
  } catch (err) {
    console.error('List messages error:', err);
    res.status(500).json({ error: '메시지 조회 중 오류가 발생했습니다.' });
  }
});

// POST /api/rooms/:id/messages — 메시지 전송 (REST fallback)
router.post('/:id/messages', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { content, message_type } = req.body;

    if (!content) {
      res.status(400).json({ error: '메시지 내용을 입력해주세요.' });
      return;
    }

    const room = await ChatRoomModel.findById(id);
    if (!room) {
      res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' });
      return;
    }

    const isParticipant = room.ceo_id === req.user!.id || room.member_id === req.user!.id;
    if (!isParticipant) {
      res.status(403).json({ error: '이 채팅방에 접근할 수 없습니다.' });
      return;
    }

    const message = await MessageModel.create({
      room_id: id,
      sender_id: req.user!.id,
      content,
      message_type: message_type || 'text',
    });

    await ChatRoomModel.updateLastMessage(id);

    const sender = await db('users')
      .where({ id: req.user!.id })
      .select('id', 'name')
      .first();

    res.status(201).json({ ...message, sender, attachments: [] });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: '메시지 전송 중 오류가 발생했습니다.' });
  }
});

export default router;
