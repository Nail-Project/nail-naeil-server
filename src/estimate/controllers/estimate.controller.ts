import { Router, Request, Response, NextFunction } from 'express';
import { EstimateService } from '../services/estimate.service';
import { CreateEstimateRequest, GetEstimatesQuery } from '../dtos/estimate.dto';
import { EstimateValidationError } from '../errors/estimate.error';
import { success } from '../../common/responses/api-response';

export class EstimateController {
  private readonly estimateService = new EstimateService();

  // POST /api/v1/estimates
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

  // GET /api/v1/estimates?status=
  getEstimatesByStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = GetEstimatesQuery.safeParse(req.query);

      if (!parsed.success) {
        throw new EstimateValidationError(parsed.error.flatten());
      }

      const result = await this.estimateService.getEstimatesByStatus(parsed.data.status);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };
}

const estimateController = new EstimateController();
const router = Router();

router.post('/', estimateController.createEstimate);
router.get('/', estimateController.getEstimatesByStatus);

export default router;
