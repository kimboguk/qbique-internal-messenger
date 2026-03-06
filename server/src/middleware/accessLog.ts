import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

const logDir = path.resolve(process.cwd(), 'logs');
const logFile = path.join(logDir, 'access.log');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export const accessLog = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const now = new Date();
    const timestamp = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');

    const ip = req.ip || req.socket.remoteAddress || '-';
    const method = req.method;
    const url = req.originalUrl;
    const status = res.statusCode;

    const user = (req as any).user;
    const userInfo = user ? `${user.name}(${user.email})` : '-';

    const line = `${timestamp} | ${ip} | ${method} ${url} | ${status} | ${duration}ms | ${userInfo}\n`;

    try {
      fs.appendFileSync(logFile, line);
    } catch {
      // silent fail
    }
  });

  next();
};
