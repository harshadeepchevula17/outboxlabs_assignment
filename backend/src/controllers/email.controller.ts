import { Request, Response, NextFunction } from 'express';
import { EmailService } from '../services/email.service';
import { EmailStatus } from '@prisma/client';

export class EmailController {
  static scheduleEmail = async (req: Request & { user?: { id: string } }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await EmailService.scheduleEmail(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        data: result.email,
        scheduling: result.scheduling,
      });
    } catch (err) {
      next(err);
    }
  };

  static listEmails = async (req: Request & { user?: { id: string } }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as any;
      const result = await EmailService.listEmails(query, req.user!.id);
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  static getScheduledEmails = async (req: Request & { user?: { id: string } }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = { ...req.query, status: EmailStatus.SCHEDULED } as any;
      const result = await EmailService.listEmails(query, req.user!.id);
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  static getSentEmails = async (req: Request & { user?: { id: string } }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = { ...req.query, status: EmailStatus.SENT } as any;
      const result = await EmailService.listEmails(query, req.user!.id);
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  static getFailedEmails = async (req: Request & { user?: { id: string } }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = { ...req.query, status: EmailStatus.FAILED } as any;
      const result = await EmailService.listEmails(query, req.user!.id);
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  static getEmailById = async (req: Request & { user?: { id: string } }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const email = await EmailService.getEmailById(id, req.user!.id);
      res.status(200).json({
        success: true,
        data: email,
      });
    } catch (err) {
      next(err);
    }
  };

  static cancelEmail = async (req: Request & { user?: { id: string } }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await EmailService.cancelEmail(id, req.user!.id);
      res.status(200).json({
        success: true,
        message: 'Email scheduled job cancelled successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}
