import { Request, Response, NextFunction } from 'express';
import { EstimateService } from '../service/estimate.service';
import { CreateEstimateRequest } from '../dto/create-estimate-request';
import { EstimateValidationError, InvalidEstimateStatusError } from '../error/estimate.error';
import { success } from '../../common/responses/api-response';

export class EstimateController {
  private readonly estimateService = new EstimateService();

  // POST /api/v1/estimate
  createEstimate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateEstimateRequest.safeParse(req.body);

      if (!parsed.success) {
        throw new EstimateValidationError(parsed.error.flatten());
      }

      const result = await this.estimateService.createEstimate(parsed.data);
      res.status(201).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/estimate/:status
  getEstimatesByStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.params;
      const validStatuses = ['MATCHING', 'COMPLETED', 'EXPIRED', 'ALL'] as const;

      if (!validStatuses.includes(status as (typeof validStatuses)[number])) {
        throw new InvalidEstimateStatusError();
      }

      const result = await this.estimateService.getEstimatesByStatus(
        status as (typeof validStatuses)[number],
      );
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };
}
