import { Request, Response, NextFunction } from 'express';
import { EstimateService } from '../service/estimate.service';
import { CreateEstimateRequest } from '../dto/create-estimate-request';
import { EstimateValidationError, InvalidEstimateRequestError } from '../error/estimate.error';
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

  // GET /api/v1/estimate/result/:request_id
  getEstimateResult = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request_id = req.params.request_id as string;
      const parsedId = parseInt(request_id, 10);

      // request_id가 숫자 형태가 아닌 경우 400
      if (isNaN(parsedId)) {
        throw new InvalidEstimateRequestError();
      }

      const result = await this.estimateService.getEstimateResult(BigInt(parsedId));
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/estimate/:proposal_id/time
  getProposalTimes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal_id = req.params.proposal_id as string;
      const parsedId = parseInt(proposal_id, 10);

      // proposal_id가 숫자 형태가 아닌 경우 400
      if (isNaN(parsedId)) {
        throw new InvalidEstimateRequestError();
      }

      const result = await this.estimateService.getProposalTimes(BigInt(parsedId));
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/estimate/:proposal_id/detail
  getProposalDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal_id = req.params.proposal_id as string;
      const parsedId = parseInt(proposal_id, 10);

      // proposal_id가 숫자 형태가 아닌 경우 400
      if (isNaN(parsedId)) throw new InvalidEstimateRequestError();

      const result = await this.estimateService.getProposalDetail(BigInt(parsedId));
      res.status(200).json(success(result));
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
        throw new InvalidEstimateRequestError();
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
