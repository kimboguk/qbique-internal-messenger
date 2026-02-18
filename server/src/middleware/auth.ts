import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserModel } from '../models/user';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'ceo' | 'member';
    name: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '인증 토큰이 필요합니다.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: string;
      email: string;
      role: string;
    };

    const user = await UserModel.findById(decoded.id);
    if (!user || !user.is_active) {
      res.status(401).json({ error: '비활성화된 계정입니다.' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: '토큰이 만료되었습니다.', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
};
