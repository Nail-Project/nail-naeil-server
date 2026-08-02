import { Request, Response, NextFunction } from 'express';
import type { DesignService } from '../service/design.service';
import { GetDesignsRequest } from '../dto/get-designs-request';
import { GetDesignDetailRequest } from '../dto/get-design-detail-request';
import { InvalidDesignIdError, InvalidDesignRequestError } from '../error/design.error';
import { success } from '../../common/responses/api-response';

export class DesignController {
  constructor(private readonly designService: DesignService) {}

  // GET /api/v1/designs
  getDesigns = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = GetDesignsRequest.safeParse(req.query);

      if (!parsed.success) {
        throw new InvalidDesignRequestError(parsed.error.flatten());
      }

      const { cursor, category, size } = parsed.data;
      const result = await this.designService.getDesigns(cursor, category, size);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/designs/:designId
  getDesignDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = GetDesignDetailRequest.safeParse(req.params);

      if (!parsed.success) {
        throw new InvalidDesignIdError(parsed.error.flatten());
      }

      const result = await this.designService.getDesignDetail(parsed.data.designId, req.userId);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };
}
