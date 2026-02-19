import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireCeo } from '../middleware/roleGuard';
import { UserModel } from '../models/user';

const router = Router();

// GET /api/users — 구성원 목록 (CEO 전용)
router.get('/', authenticate, requireCeo, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const members = await UserModel.findAllMembers();
    res.json(members);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: '구성원 목록 조회 중 오류가 발생했습니다.' });
  }
});

// PATCH /api/users/:id — 구성원 활성화/비활성화 (CEO 전용)
router.patch('/:id', authenticate, requireCeo, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_active, title } = req.body;

    // title만 변경하는 경우
    if (title !== undefined && is_active === undefined) {
      if (typeof title !== 'string' && title !== null) {
        res.status(400).json({ error: 'title은 문자열 또는 null이어야 합니다.' });
        return;
      }
      const user = await UserModel.updateProfile(id, { title: title || null });
      if (!user) {
        res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        return;
      }
      res.json(user);
      return;
    }

    if (typeof is_active !== 'boolean') {
      res.status(400).json({ error: 'is_active 값을 boolean으로 전달해주세요.' });
      return;
    }

    // CEO 자신의 계정은 비활성화 불가
    if (id === req.user!.id) {
      res.status(400).json({ error: '자신의 계정은 변경할 수 없습니다.' });
      return;
    }

    const user = await UserModel.updateActive(id, is_active);
    if (!user) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      return;
    }

    res.json(user);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: '구성원 상태 변경 중 오류가 발생했습니다.' });
  }
});

export default router;
