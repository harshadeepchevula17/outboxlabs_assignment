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


// Temporary SMTP connectivity diagnostic
router.get('/smtp-test', async (_req, res) => {
  const host = 'smtp.ethereal.email';
  const startedAt = Date.now();

  const testPort = (port: number) =>
    new Promise<{ port: number; connected: boolean; error?: string }>((resolve) => {
      const socket = net.createConnection({ host, port });

      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({
          port,
          connected: false,
          error: 'TCP connection timeout',
        });
      }, 10000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ port, connected: true });
      });

      socket.on('error', (err) => {
        clearTimeout(timeout);
        resolve({
          port,
          connected: false,
          error: err.message,
        });
      });
    });

  try {
    const addresses = await dns.resolve4(host);

    const results = await Promise.all([
      testPort(587),
      testPort(465),
    ]);

    res.json({
      host,
      dnsResolved: true,
      addresses,
      ports: results,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (err: any) {
    res.status(500).json({
      host,
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
