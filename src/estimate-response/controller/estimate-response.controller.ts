import type { NextFunction, Request, Response } from 'express';
import { success } from '../../common/responses/api-response';
import { createSmsMessageRequestSchema } from '../dto/request/create-sms-message-request';
import { InvalidEstimateResponseError } from '../errors/estimate-response.error';
import type { EstimateResponseService } from '../service/estimate-response.service';

export class EstimateResponseController {
  constructor(private readonly service: EstimateResponseService) {}

  receive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createSmsMessageRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        throw new InvalidEstimateResponseError({
          issues: parsed.error.issues.map(({ path, message }) => ({ path, message })),
        });
      }

      const response = await this.service.createSmsMessage(parsed.data);
      res.status(202).json(success(response));
    } catch (error) {
      next(error);
    }
  };

  getDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const proposalId = this.parsePositiveInteger(req.params.proposal_id, 'proposal_id');
      res.status(200).json(success(await this.service.getDetail(proposalId, req.userId)));
    } catch (error) {
      next(error);
    }
  };

  getList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requestId = this.parsePositiveInteger(req.params.request_id, 'request_id');
      // auth 미들웨어가 JWT에서 추출한 userId로 본인 견적인지 확인한다.
      res.status(200).json(success(await this.service.getList(requestId, req.userId)));
    } catch (error) {
      next(error);
    }
  };

  getProposalTimes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const proposalId = this.parsePositiveInteger(req.params.proposal_id, 'proposal_id');
      res.status(200).json(success(await this.service.getProposalTimes(proposalId, req.userId)));
    } catch (error) {
      next(error);
    }
  };

  private parsePositiveInteger(value: unknown, field: string): number {
    const parsed = typeof value === 'string' ? Number(value) : Number.NaN;

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new InvalidEstimateResponseError({ field });
    }

    return parsed;
  }
}
