import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireRole = (...roles: Array<'ceo' | 'member'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: '인증이 필요합니다.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: '접근 권한이 없습니다.' });
      return;
    }

    next();
  };
};

export const requireCeo = requireRole('ceo');
