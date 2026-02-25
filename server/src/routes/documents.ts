import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireCeo } from '../middleware/roleGuard';
import { DocumentModel } from '../models/document';
import { DocumentTagModel } from '../models/documentTag';
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

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
});

const router = Router();

// GET /api/documents — 문서 목록
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, category_id, tag_id, search, doc_type, page, limit } = req.query;

    const result = await DocumentModel.findAccessible(req.user!.id, req.user!.role, {
      status: status as string,
      category_id: category_id as string,
      tag_id: tag_id as string,
      search: search as string,
      doc_type: doc_type as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    // Attach author name and tags to each document
    const documentsWithDetails = await Promise.all(
      result.documents.map(async (doc) => {
        const author = await db('users')
          .where({ id: doc.author_id })
          .select('id', 'name')
          .first();
        const tags = await DocumentTagModel.getTagsForDocument(doc.id);
        const category = doc.category_id
          ? await db('document_categories').where({ id: doc.category_id }).select('id', 'name').first()
          : null;
        return { ...doc, author, tags, category };
      })
    );

    res.json({ documents: documentsWithDetails, total: result.total });
  } catch (err) {
    console.error('List documents error:', err);
    res.status(500).json({ error: '문서 목록 조회 중 오류가 발생했습니다.' });
  }
});

// POST /api/documents — 문서 생성
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, doc_type, content, template_id, category_id, tags, is_public, status } = req.body;

    if (!title) {
      res.status(400).json({ error: '문서 제목을 입력해주세요.' });
      return;
    }

    const doc = await DocumentModel.create({
      title,
      doc_type: doc_type || 'freeform',
      content,
      template_id,
      category_id,
      is_public: is_public || false,
      status: status || 'draft',
      author_id: req.user!.id,
    });

    // Set tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      await DocumentTagModel.setTagsForDocument(doc.id, tags);
    }

    const docTags = await DocumentTagModel.getTagsForDocument(doc.id);
    res.status(201).json({ ...doc, tags: docTags });
  } catch (err) {
    console.error('Create document error:', err);
    res.status(500).json({ error: '문서 생성 중 오류가 발생했습니다.' });
  }
});

// GET /api/documents/:id — 문서 상세
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const hasAccess = await DocumentModel.hasAccess(id, req.user!.id, req.user!.role);
    if (!hasAccess) {
      res.status(403).json({ error: '이 문서에 접근할 수 없습니다.' });
      return;
    }

    const doc = await DocumentModel.findByIdWithDetails(id);
    if (!doc) {
      res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
      return;
    }

    const tags = await DocumentTagModel.getTagsForDocument(id);
    const shares = await DocumentModel.getShares(id);
    const attachments = await DocumentModel.getAttachments(id);

    res.json({ ...doc, tags, shares, attachments });
  } catch (err) {
    console.error('Get document error:', err);
    res.status(500).json({ error: '문서 조회 중 오류가 발생했습니다.' });
  }
});

// PATCH /api/documents/:id — 문서 수정 (작성자만, draft/rejected 상태)
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const doc = await DocumentModel.findById(id);

    if (!doc) {
      res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
      return;
    }

    if (doc.author_id !== req.user!.id) {
      res.status(403).json({ error: '작성자만 문서를 수정할 수 있습니다.' });
      return;
    }

    if (!['draft', 'rejected'].includes(doc.status)) {
      res.status(400).json({ error: '임시저장 또는 반려된 문서만 수정할 수 있습니다.' });
      return;
    }

    const { title, content, category_id, is_public, tags } = req.body;

    const updated = await DocumentModel.update(id, { title, content, category_id, is_public });

    if (tags && Array.isArray(tags)) {
      await DocumentTagModel.setTagsForDocument(id, tags);
    }

    const docTags = await DocumentTagModel.getTagsForDocument(id);
    res.json({ ...updated, tags: docTags });
  } catch (err) {
    console.error('Update document error:', err);
    res.status(500).json({ error: '문서 수정 중 오류가 발생했습니다.' });
  }
});

// DELETE /api/documents/:id — 문서 삭제
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const doc = await DocumentModel.findById(id);

    if (!doc) {
      res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
      return;
    }

    // 작성자: draft만 삭제 가능, CEO: 모두 삭제 가능
    if (req.user!.role === 'ceo') {
      // CEO can delete any document
    } else if (doc.author_id === req.user!.id && doc.status === 'draft') {
      // Author can delete own drafts
    } else {
      res.status(403).json({ error: '삭제 권한이 없습니다.' });
      return;
    }

    await DocumentModel.delete(id);
    res.json({ message: '문서가 삭제되었습니다.' });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: '문서 삭제 중 오류가 발생했습니다.' });
  }
});

// POST /api/documents/:id/submit — 승인 제출 (draft/rejected → pending)
router.post('/:id/submit', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const doc = await DocumentModel.findById(id);

    if (!doc) {
      res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
      return;
    }

    if (doc.author_id !== req.user!.id) {
      res.status(403).json({ error: '작성자만 문서를 제출할 수 있습니다.' });
      return;
    }

    const updated = await DocumentModel.submit(id);
    if (!updated) {
      res.status(400).json({ error: '임시저장 또는 반려된 문서만 제출할 수 있습니다.' });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error('Submit document error:', err);
    res.status(500).json({ error: '문서 제출 중 오류가 발생했습니다.' });
  }
});

// POST /api/documents/:id/review — CEO 승인/반려
router.post('/:id/review', authenticate, requireCeo, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, comment } = req.body;

    if (!action || !['approved', 'rejected'].includes(action)) {
      res.status(400).json({ error: '승인(approved) 또는 반려(rejected)를 선택해주세요.' });
      return;
    }

    const updated = await DocumentModel.review(id, req.user!.id, action, comment);
    if (!updated) {
      res.status(400).json({ error: '승인 대기 상태의 문서만 검토할 수 있습니다.' });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error('Review document error:', err);
    res.status(500).json({ error: '문서 검토 중 오류가 발생했습니다.' });
  }
});

// POST /api/documents/:id/share — 공유 설정
router.post('/:id/share', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { user_ids } = req.body;
    const doc = await DocumentModel.findById(id);

    if (!doc) {
      res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
      return;
    }

    if (doc.author_id !== req.user!.id && req.user!.role !== 'ceo') {
      res.status(403).json({ error: '공유 설정 권한이 없습니다.' });
      return;
    }

    await DocumentModel.share(id, user_ids || []);
    const shares = await DocumentModel.getShares(id);
    res.json(shares);
  } catch (err) {
    console.error('Share document error:', err);
    res.status(500).json({ error: '문서 공유 설정 중 오류가 발생했습니다.' });
  }
});

// DELETE /api/documents/:id/share/:userId — 공유 해제
router.delete('/:id/share/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, userId } = req.params;
    const doc = await DocumentModel.findById(id);

    if (!doc) {
      res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
      return;
    }

    if (doc.author_id !== req.user!.id && req.user!.role !== 'ceo') {
      res.status(403).json({ error: '공유 해제 권한이 없습니다.' });
      return;
    }

    await DocumentModel.unshare(id, userId);
    res.json({ message: '공유가 해제되었습니다.' });
  } catch (err) {
    console.error('Unshare document error:', err);
    res.status(500).json({ error: '문서 공유 해제 중 오류가 발생했습니다.' });
  }
});

// POST /api/documents/:id/attachments — 파일 첨부
router.post('/:id/attachments', authenticate, upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const doc = await DocumentModel.findById(id);

    if (!doc) {
      res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
      return;
    }

    if (doc.author_id !== req.user!.id && req.user!.role !== 'ceo') {
      res.status(403).json({ error: '첨부파일 추가 권한이 없습니다.' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: '파일을 선택해주세요.' });
      return;
    }

    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    const attachment = await DocumentModel.addAttachment({
      document_id: id,
      filename: originalName,
      filepath: req.file.filename,
      file_type: req.file.mimetype,
      file_size: req.file.size,
    });

    res.status(201).json(attachment);
  } catch (err) {
    console.error('Add attachment error:', err);
    res.status(500).json({ error: '파일 첨부 중 오류가 발생했습니다.' });
  }
});

// DELETE /api/documents/:id/attachments/:attachmentId — 첨부 삭제
router.delete('/:id/attachments/:attachmentId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, attachmentId } = req.params;
    const doc = await DocumentModel.findById(id);

    if (!doc) {
      res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
      return;
    }

    if (doc.author_id !== req.user!.id && req.user!.role !== 'ceo') {
      res.status(403).json({ error: '첨부파일 삭제 권한이 없습니다.' });
      return;
    }

    const attachment = await DocumentModel.findAttachment(attachmentId);
    if (!attachment || attachment.document_id !== id) {
      res.status(404).json({ error: '첨부파일을 찾을 수 없습니다.' });
      return;
    }

    // Delete file from disk
    const filePath = path.resolve(config.upload.dir, attachment.filepath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await DocumentModel.deleteAttachment(attachmentId);
    res.json({ message: '첨부파일이 삭제되었습니다.' });
  } catch (err) {
    console.error('Delete attachment error:', err);
    res.status(500).json({ error: '첨부파일 삭제 중 오류가 발생했습니다.' });
  }
});

// POST /api/documents/:id/chat-share — 채팅방에 문서 링크 공유
router.post('/:id/chat-share', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { room_id } = req.body;

    const doc = await DocumentModel.findById(id);
    if (!doc) {
      res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
      return;
    }

    const room = await ChatRoomModel.findById(room_id);
    if (!room) {
      res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' });
      return;
    }

    const isParticipant = room.ceo_id === req.user!.id || room.member_id === req.user!.id;
    if (!isParticipant) {
      res.status(403).json({ error: '이 채팅방에 접근할 수 없습니다.' });
      return;
    }

    // Create system message with document link
    const message = await MessageModel.create({
      room_id,
      sender_id: req.user!.id,
      content: `[문서] ${doc.title} (/documents/${doc.id})`,
      message_type: 'system',
    });

    await ChatRoomModel.updateLastMessage(room_id);

    res.status(201).json(message);
  } catch (err) {
    console.error('Chat share error:', err);
    res.status(500).json({ error: '문서 공유 중 오류가 발생했습니다.' });
  }
});

export default router;
