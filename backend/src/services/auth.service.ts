import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/database';
import { config } from '../config/env';
import { AppError } from './email.service';

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

export interface AuthUserPayload {
  id: string;
  email: string;
  name?: string | null;
  provider: 'local' | 'google';
}

export class AuthService {
  static async registerWithEmail(email: string, password: string, name?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existing) {
      throw new AppError(409, 'USER_EXISTS', 'User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name?.trim() || null,
        provider: 'local',
      },
    });

    return this.buildAuthResponse(user);
  }

  static async loginWithEmail(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || !user.passwordHash) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  static async loginWithGoogle(idToken: string) {
    if (!config.GOOGLE_CLIENT_ID) {
      throw new AppError(500, 'GOOGLE_NOT_CONFIGURED', 'Google OAuth is not configured');
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new AppError(401, 'GOOGLE_INVALID_TOKEN', 'Invalid Google token');
    }

    const email = payload.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: payload.name || null,
          provider: 'google',
          googleId: payload.sub,
          avatarUrl: payload.picture || null,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: payload.sub,
          avatarUrl: payload.picture || null,
          provider: 'google',
        },
      });
    }

    return this.buildAuthResponse(user);
  }

  static buildAuthResponse(user: { id: string; email: string; name?: string | null; provider: string }) {
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
      },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
      },
    };
  }

  static async getUserFromToken(token: string) {
    const payload = jwt.verify(token, config.JWT_SECRET) as { sub: string; email: string };
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new AppError(401, 'USER_NOT_FOUND', 'User not found');
    }
    return user;
  }
}
