import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireCeo } from '../middleware/roleGuard';
import { FormTemplateModel } from '../models/formTemplate';

const router = Router();

// GET /api/form-templates — 템플릿 목록
router.get('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const templates = await FormTemplateModel.findAll();
    res.json(templates);
  } catch (err) {
    console.error('List templates error:', err);
    res.status(500).json({ error: '템플릿 목록 조회 중 오류가 발생했습니다.' });
  }
});

// GET /api/form-templates/:id — 템플릿 상세
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const template = await FormTemplateModel.findById(req.params.id);
    if (!template) {
      res.status(404).json({ error: '템플릿을 찾을 수 없습니다.' });
      return;
    }
    res.json(template);
  } catch (err) {
    console.error('Get template error:', err);
    res.status(500).json({ error: '템플릿 조회 중 오류가 발생했습니다.' });
  }
});

// POST /api/form-templates — 템플릿 생성 (CEO)
router.post('/', authenticate, requireCeo, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, category_id, schema } = req.body;
    if (!name || !schema) {
      res.status(400).json({ error: '템플릿 이름과 스키마를 입력해주세요.' });
      return;
    }

    const template = await FormTemplateModel.create({
      name,
      description,
      category_id,
      schema,
      created_by: req.user!.id,
    });

    res.status(201).json(template);
  } catch (err) {
    console.error('Create template error:', err);
    res.status(500).json({ error: '템플릿 생성 중 오류가 발생했습니다.' });
  }
});

// PATCH /api/form-templates/:id — 템플릿 수정 (CEO)
router.patch('/:id', authenticate, requireCeo, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, category_id, schema, is_active } = req.body;

    const template = await FormTemplateModel.update(req.params.id, {
      name,
      description,
      category_id,
      schema,
      is_active,
    });

    if (!template) {
      res.status(404).json({ error: '템플릿을 찾을 수 없습니다.' });
      return;
    }

    res.json(template);
  } catch (err) {
    console.error('Update template error:', err);
    res.status(500).json({ error: '템플릿 수정 중 오류가 발생했습니다.' });
  }
});

// DELETE /api/form-templates/:id — 템플릿 삭제 (CEO)
router.delete('/:id', authenticate, requireCeo, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const template = await FormTemplateModel.findById(req.params.id);
    if (!template) {
      res.status(404).json({ error: '템플릿을 찾을 수 없습니다.' });
      return;
    }

    await FormTemplateModel.delete(req.params.id);
    res.json({ message: '템플릿이 삭제되었습니다.' });
  } catch (err) {
    console.error('Delete template error:', err);
    res.status(500).json({ error: '템플릿 삭제 중 오류가 발생했습니다.' });
  }
});

export default router;
