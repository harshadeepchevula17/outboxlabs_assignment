import { describe, it, expect, vi } from 'vitest';
import { errorHandler } from '../src/middleware/errorHandler';

describe('errorHandler', () => {
  it('returns a database unavailable response for Prisma/driver connection errors', () => {
    const req = { path: '/api/auth/register', method: 'POST' } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;

    const next = vi.fn();

    errorHandler({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED 127.0.0.1:5432' }, req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database is unavailable. Please verify PostgreSQL is running.',
      },
    });
  });
});
