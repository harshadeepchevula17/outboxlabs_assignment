import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { prisma } from '../config/database';
import { AppError } from '../services/email.service';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    provider: string;
  };
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const decoded = jwt.verify(token, config.JWT_SECRET) as { sub: string; email: string; provider: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });

    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not found');
    }

    req.user = {
      id: user.id,
      email: user.email,
      provider: user.provider,
    };
    next();
  } catch (err) {
    next(err);
  }
};
