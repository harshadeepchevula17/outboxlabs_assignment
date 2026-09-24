import { Router } from 'express';
import { validateRequest } from '../middleware/validate';
import { loginSchema, registerSchema, googleLoginSchema } from '../schemas/auth.schema';
import { AuthService } from '../services/auth.service';

const router = Router();

router.post('/register', validateRequest({ body: registerSchema }), async (req, res, next) => {
  try {
    const result = await AuthService.registerWithEmail(req.body.email, req.body.password, req.body.name);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/login', validateRequest({ body: loginSchema }), async (req, res, next) => {
  try {
    const result = await AuthService.loginWithEmail(req.body.email, req.body.password);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/google', validateRequest({ body: googleLoginSchema }), async (req, res, next) => {
  try {
    const result = await AuthService.loginWithGoogle(req.body.idToken);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
