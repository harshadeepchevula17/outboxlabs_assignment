import { Request, Response, NextFunction } from 'express';
import { SenderService } from '../services/sender.service';

export class SenderController {
  static createSender = async (req: Request & { user?: { id: string } }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sender = await SenderService.createSender(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        data: sender,
      });
    } catch (err) {
      next(err);
    }
  };

  static autoGenerateSender = async (req: Request & { user?: { id: string } }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await SenderService.autoGenerateSender(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        data: result.sender,
        etherealWebUrl: result.etherealWebUrl,
      });
    } catch (err) {
      next(err);
    }
  };

  static listSenders = async (req: Request & { user?: { id: string } }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const senders = await SenderService.getAllSenders(req.user!.id);
      res.status(200).json({
        success: true,
        data: senders,
      });
    } catch (err) {
      next(err);
    }
  };

  static getSenderById = async (req: Request & { user?: { id: string } }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const sender = await SenderService.getSenderById(id, req.user!.id);
      res.status(200).json({
        success: true,
        data: sender,
      });
    } catch (err) {
      next(err);
    }
  };

  static deleteSender = async (req: Request & { user?: { id: string } }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await SenderService.deleteSender(id, req.user!.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  static getSenderRateLimit = async (req: Request & { user?: { id: string } }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const rateLimit = await SenderService.getSenderRateLimit(id, req.user!.id);
      res.status(200).json({
        success: true,
        data: rateLimit,
      });
    } catch (err) {
      next(err);
    }
  };
}
