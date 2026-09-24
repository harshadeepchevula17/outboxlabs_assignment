import { Router } from 'express';
import emailRoutes from './email.routes';
import senderRoutes from './sender.routes';
import dashboardRoutes from './dashboard.routes';
import authRoutes from './auth.routes';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.use('/auth', authRoutes);
router.use('/emails', emailRoutes);
router.use('/senders', senderRoutes);
router.use('/dashboard', dashboardRoutes);

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'OutboxLabs Email Scheduler API',
  });
});

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.status(200).json({
    success: true,
    data: {
      id: req.user?.id,
      email: req.user?.email,
      provider: req.user?.provider,
    },
  });
});

export default router;
