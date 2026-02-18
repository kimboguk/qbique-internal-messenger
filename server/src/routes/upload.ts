import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth';
import { MessageModel } from '../models/message';
import { ChatRoomModel } from '../models/chatRoom';
import db from '../db';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(config.upload.dir));
  },
  filename: (_req, file, cb) => {
    const name = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(name);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const allowedMimeTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('허용되지 않은 파일 형식입니다.'));
    }
  },
});

const router = Router();

// POST /api/upload — 파일 업로드 (채팅 메시지 연동)
router.post('/', authenticate, upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '파일을 선택해주세요.' });
      return;
    }

    // multer는 filename을 latin1로 디코딩하므로 UTF-8로 재변환
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    const roomId = req.body.room_id;

    // room_id가 있으면 채팅 메시지+첨부파일 생성
    if (roomId) {
      const room = await ChatRoomModel.findById(roomId);
      if (!room) {
        res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' });
        return;
      }

      const isParticipant = room.ceo_id === req.user!.id || room.member_id === req.user!.id;
      if (!isParticipant) {
        res.status(403).json({ error: '이 채팅방에 접근할 수 없습니다.' });
        return;
      }

      // 파일 메시지 생성
      const message = await MessageModel.create({
        room_id: roomId,
        sender_id: req.user!.id,
        content: originalName,
        message_type: 'file',
      });

      // 첨부파일 레코드 생성
      const [attachment] = await db('attachments')
        .insert({
          message_id: message.id,
          filename: originalName,
          filepath: req.file.filename,
          file_type: req.file.mimetype,
          file_size: req.file.size,
        })
        .returning('*');

      await ChatRoomModel.updateLastMessage(roomId);

      const sender = await db('users')
        .where({ id: req.user!.id })
        .select('id', 'name')
        .first();

      res.status(201).json({
        message: { ...message, sender, attachments: [attachment] },
        attachment,
      });
      return;
    }

    // room_id 없으면 파일만 업로드
    res.status(201).json({
      filename: originalName,
      filepath: req.file.filename,
      file_type: req.file.mimetype,
      file_size: req.file.size,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: '파일 업로드 중 오류가 발생했습니다.' });
  }
});

export default router;
