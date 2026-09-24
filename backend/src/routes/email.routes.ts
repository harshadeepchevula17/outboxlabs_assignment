import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';
import { validateRequest } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  scheduleEmailSchema,
  listEmailQuerySchema,
  emailIdParamSchema,
} from '../schemas/email.schema';

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

// Email detail
router.get('/:id', validateRequest({ params: emailIdParamSchema }), EmailController.getEmailById);

// Cancel scheduled email
router.delete('/:id', validateRequest({ params: emailIdParamSchema }), EmailController.cancelEmail);

export default router;
