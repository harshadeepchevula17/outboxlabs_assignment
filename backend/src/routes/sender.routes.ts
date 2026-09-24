import { Router } from 'express';
import { SenderController } from '../controllers/sender.controller';
import { validateRequest } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  createSenderSchema,
  autoGenerateSenderSchema,
  senderIdParamSchema,
} from '../schemas/sender.schema';

const router = Router();
router.use(requireAuth);

router.post('/', validateRequest({ body: createSenderSchema }), SenderController.createSender);
router.post(
  '/auto-generate',
  validateRequest({ body: autoGenerateSenderSchema }),
  SenderController.autoGenerateSender
);

router.get('/', SenderController.listSenders);
router.get('/:id', validateRequest({ params: senderIdParamSchema }), SenderController.getSenderById);
router.get(
  '/:id/rate-limit',
  validateRequest({ params: senderIdParamSchema }),
  SenderController.getSenderRateLimit
);
router.delete('/:id', validateRequest({ params: senderIdParamSchema }), SenderController.deleteSender);

export default router;
