import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireCeo } from '../middleware/roleGuard';
import { DocumentCategoryModel } from '../models/documentCategory';

const router = Router();

// GET /api/document-categories — 카테고리 목록
router.get('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const categories = await DocumentCategoryModel.findAll();
    res.json(categories);
  } catch (err) {
    console.error('List categories error:', err);
    res.status(500).json({ error: '카테고리 목록 조회 중 오류가 발생했습니다.' });
  }
});

// POST /api/document-categories — 카테고리 생성 (CEO)
router.post('/', authenticate, requireCeo, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, sort_order } = req.body;
    if (!name) {
      res.status(400).json({ error: '카테고리 이름을 입력해주세요.' });
      return;
    }

    const category = await DocumentCategoryModel.create({
      name,
      description,
      sort_order: sort_order || 0,
      created_by: req.user!.id,
    });

    res.status(201).json(category);
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: '카테고리 생성 중 오류가 발생했습니다.' });
  }
});

// PATCH /api/document-categories/:id — 카테고리 수정 (CEO)
router.patch('/:id', authenticate, requireCeo, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, sort_order, is_active } = req.body;

    const category = await DocumentCategoryModel.update(id, { name, description, sort_order, is_active });
    if (!category) {
      res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
      return;
    }

    res.json(category);
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: '카테고리 수정 중 오류가 발생했습니다.' });
  }
});

// DELETE /api/document-categories/:id — 카테고리 삭제 (CEO)
router.delete('/:id', authenticate, requireCeo, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const category = await DocumentCategoryModel.findById(id);
    if (!category) {
      res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
      return;
    }

    await DocumentCategoryModel.delete(id);
    res.json({ message: '카테고리가 삭제되었습니다.' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: '카테고리 삭제 중 오류가 발생했습니다.' });
  }
});

export default router;
