import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import authRoutes from './routes/auth';
import inviteRoutes from './routes/invites';
import userRoutes from './routes/users';
import roomRoutes from './routes/rooms';
import uploadRoutes from './routes/upload';
import { ipWhitelist } from './middleware/ipWhitelist';
import { setupSocketHandlers } from './socket';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tailscale IP whitelist (개발 시 비활성화 가능)
if (config.tailscale.enabled) {
  app.use(ipWhitelist);
}

// Static files for uploads
app.use('/uploads', express.static(path.resolve(config.upload.dir)));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO
setupSocketHandlers(io);

// Export io for use in other modules
export { io };

// Start server
httpServer.listen(config.port, () => {
  console.log(`QIM Server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Tailscale IP filter: ${config.tailscale.enabled ? 'ENABLED' : 'DISABLED'}`);
});
