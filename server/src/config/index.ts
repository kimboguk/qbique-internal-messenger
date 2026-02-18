import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'qim',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD ?? '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'qim-dev-jwt-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'qim-dev-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  },

  tailscale: {
    enabled: process.env.TAILSCALE_ENABLED === 'true',
    allowedIps: (process.env.TAILSCALE_ALLOWED_IPS || '').split(',').filter(Boolean),
  },

  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8008',
};
