import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import logger from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/auth.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import requestRoutes from './routes/request.routes.js';
import evidenceRoutes from './routes/evidence.routes.js';
import portalRoutes from './routes/portal.routes.js';
import auditRoutes from './routes/audit.routes.js';

const app = express();

// ── Middleware global ──
app.use(helmet());
app.use(cors({
  origin: config.isDev ? ['http://localhost:3001', 'http://localhost:3002'] : config.baseUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api', apiLimiter);

// ── Health check ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/evidences', evidenceRoutes);
app.use('/api/submit', portalRoutes);
app.use('/api/audit-logs', auditRoutes);

// ── Error handling ──
app.use(errorHandler);

// ── Start server ──
app.listen(config.port, () => {
  logger.info(`Servidor iniciado en puerto ${config.port}`, {
    env: config.nodeEnv,
    url: config.baseUrl,
  });
});

export default app;
