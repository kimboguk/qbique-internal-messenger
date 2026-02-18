import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export const ipWhitelist = (req: Request, res: Response, next: NextFunction): void => {
  if (!config.tailscale.enabled) {
    next();
    return;
  }

  // Express에서 실제 클라이언트 IP 추출 (Nginx 프록시 뒤)
  const clientIp = req.headers['x-forwarded-for']
    ? (req.headers['x-forwarded-for'] as string).split(',')[0].trim()
    : req.socket.remoteAddress;

  // IPv6 mapped IPv4 처리 (::ffff:100.99.64.32 → 100.99.64.32)
  const normalizedIp = clientIp?.replace(/^::ffff:/, '') || '';

  // Tailscale 서브넷 (100.64.0.0/10) 체크 또는 허용 IP 목록 체크
  const isTailscaleSubnet = normalizedIp.startsWith('100.');
  const isAllowed = config.tailscale.allowedIps.includes(normalizedIp);
  const isLocalhost = ['127.0.0.1', '::1', 'localhost'].includes(normalizedIp);

  if (!isTailscaleSubnet && !isAllowed && !isLocalhost) {
    res.status(403).json({ error: '허용되지 않은 IP 주소입니다.' });
    return;
  }

  next();
};
