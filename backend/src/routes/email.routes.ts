import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';
import { validateRequest } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  scheduleEmailSchema,
  listEmailQuerySchema,
  emailIdParamSchema,
} from '../schemas/email.schema';
import dns from 'node:dns/promises';
import net from 'node:net';

const router = Router();
router.use(requireAuth);

// Schedule email
router.post('/', validateRequest({ body: scheduleEmailSchema }), EmailController.scheduleEmail);

// Filtered helper lists (Must be defined before /:id)
router.get('/scheduled', validateRequest({ query: listEmailQuerySchema }), EmailController.getScheduledEmails);
router.get('/sent', validateRequest({ query: listEmailQuerySchema }), EmailController.getSentEmails);
router.get('/failed', validateRequest({ query: listEmailQuerySchema }), EmailController.getFailedEmails);

// List emails
router.get('/', validateRequest({ query: listEmailQuerySchema }), EmailController.listEmails);

router.get('/smtp-test', async (_req, res) => {
  const host = 'smtp.ethereal.email';
  const port = 587;
  const startedAt = Date.now();

  try {
    const addresses = await dns.resolve4(host);

    const result = await new Promise<{ connected: boolean; error?: string }>((resolve) => {
      const socket = net.createConnection({ host, port });

      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({
          connected: false,
          error: 'TCP connection timeout',
        });
      }, 10000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ connected: true });
      });

      socket.on('error', (err) => {
        clearTimeout(timeout);
        resolve({
          connected: false,
          error: err.message,
        });
      });
    });

    res.json({
      host,
      port,
      dnsResolved: true,
      addresses,
      ...result,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (err: any) {
    res.status(500).json({
      host,
      port,
      dnsResolved: false,
      error: err?.message || 'DNS resolution failed',
      elapsedMs: Date.now() - startedAt,
    });
  }
});
// Email detail
router.get('/:id', validateRequest({ params: emailIdParamSchema }), EmailController.getEmailById);

// Cancel scheduled email
router.delete('/:id', validateRequest({ params: emailIdParamSchema }), EmailController.cancelEmail);

export default router;
