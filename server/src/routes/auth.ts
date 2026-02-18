import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserModel } from '../models/user';
import { InviteModel } from '../models/invite';
import { ChatRoomModel } from '../models/chatRoom';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/register — 초대 토큰으로 회원가입
router.post('/register', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token, name, email, password } = req.body;

    if (!token || !name || !email || !password) {
      res.status(400).json({ error: '모든 필드를 입력해주세요.' });
      return;
    }

    // 초대 토큰 검증
    const isValid = await InviteModel.isValid(token);
    if (!isValid) {
      res.status(400).json({ error: '유효하지 않거나 만료된 초대 토큰입니다.' });
      return;
    }

    // 이메일 중복 확인
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      res.status(409).json({ error: '이미 등록된 이메일입니다.' });
      return;
    }

    // 사용자 생성
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({
      name,
      email,
      role: 'member',
      password_hash: passwordHash,
    });

    // 초대 토큰 사용 처리
    await InviteModel.markUsed(token, user.id);

    // CEO와의 채팅방 자동 생성 (법인 운영 + 플랫폼 피드백)
    const ceo = await UserModel.findCeo();
    if (ceo) {
      await ChatRoomModel.createPair(ceo.id, user.id);
    }

    // JWT 발급
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '회원가입 처리 중 오류가 발생했습니다.' });
  }
});

// POST /api/auth/login — 로그인
router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
      return;
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: '비활성화된 계정입니다. 관리자에게 문의하세요.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }

    // 마지막 접속 시간 업데이트
    await UserModel.updateLastSeen(user.id);

    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
  }
});

// POST /api/auth/refresh — 토큰 갱신
router.post('/refresh', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh 토큰이 필요합니다.' });
      return;
    }

    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { id: string };
    const user = await UserModel.findById(decoded.id);

    if (!user || !user.is_active) {
      res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
      return;
    }

    const newAccessToken = generateAccessToken(user.id, user.email, user.role);

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ error: 'Refresh 토큰이 만료되었거나 유효하지 않습니다.' });
  }
});

// GET /api/auth/me — 현재 사용자 정보
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await UserModel.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      last_seen_at: user.last_seen_at,
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: '사용자 정보 조회 중 오류가 발생했습니다.' });
  }
});

// JWT 토큰 생성 헬퍼
function generateAccessToken(id: string, email: string, role: string): string {
  return jwt.sign({ id, email, role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as string & jwt.SignOptions['expiresIn'],
  });
}

function generateRefreshToken(id: string): string {
  return jwt.sign({ id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as string & jwt.SignOptions['expiresIn'],
  });
}

export default router;
