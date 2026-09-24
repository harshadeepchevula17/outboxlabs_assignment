import { Request, Response, NextFunction } from 'express';
import { EmailService } from '../services/email.service';

export class DashboardController {
  static getStats = async (req: Request & { user?: { id: string } }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await EmailService.getDashboardStats(req.user!.id);
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  };
}
