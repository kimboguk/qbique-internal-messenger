import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireCeo } from '../middleware/roleGuard';
import { InviteModel } from '../models/invite';

const router = Router();

// POST /api/invites — 초대 링크 생성 (CEO 전용)
router.post('/', authenticate, requireCeo, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invite = await InviteModel.create(req.user!.id);

    res.status(201).json({
      id: invite.id,
      token: invite.token,
      expires_at: invite.expires_at,
      register_url: `/register/${invite.token}`,
    });
  } catch (err) {
    console.error('Create invite error:', err);
    res.status(500).json({ error: '초대 링크 생성 중 오류가 발생했습니다.' });
  }
});

// GET /api/invites — 초대 토큰 목록 (CEO 전용)
router.get('/', authenticate, requireCeo, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invites = await InviteModel.findAll(req.user!.id);

    res.json(
      invites.map((inv) => ({
        id: inv.id,
        token: inv.token,
        is_used: inv.is_used,
        used_by: inv.used_by,
        expires_at: inv.expires_at,
        is_expired: new Date(inv.expires_at) < new Date(),
      }))
    );
  } catch (err) {
    console.error('List invites error:', err);
    res.status(500).json({ error: '초대 목록 조회 중 오류가 발생했습니다.' });
  }
});

export default router;
