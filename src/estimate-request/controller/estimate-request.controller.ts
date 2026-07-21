import { Request, Response, NextFunction } from 'express';
import { EstimateRequestService } from '../service/estimate-request.service';
import { CreateEstimateRequestSchema } from '../dto/request/create-estimate-request.dto';
import {
  EstimateRequestValidationError,
  InvalidEstimateRequestError,
} from '../error/estimate-request.error';
import { success } from '../../common/responses/api-response';

export class EstimateRequestController {
  constructor(private readonly service: EstimateRequestService) {}

  /**
   * POST /api/v1/estimate-request
   * 견적 요청 생성
   *
   * 1. zod 스키마로 request body 검증
   * 2. 검증 실패 시 EstimateRequestValidationError (400) throw
   * 3. 성공 시 생성된 견적 요청 + 이미지 목록 반환 (201)
   */
  createEstimateRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = CreateEstimateRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        // zod flatten()으로 필드별 에러 메시지를 data에 담아 클라이언트에 전달한다.
        throw new EstimateRequestValidationError(parsed.error.flatten());
      }

      const result = await this.service.createEstimateRequest(parsed.data);
      res.status(201).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/estimate-request?status=MATCHING
   * 상태별 견적 요청 목록 조회
   *
   * - status 쿼리 파라미터로 필터링한다.
   * - 허용값: MATCHING | COMPLETED | EXPIRED | ALL
   * - ALL이면 상태 필터 없이 전체 조회한다.
   * - 유효하지 않은 status → InvalidEstimateRequestError (400)
   */
  getEstimatesByStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status } = req.params;
      const validStatuses = ['MATCHING', 'COMPLETED', 'EXPIRED', 'ALL'] as const;

      if (!validStatuses.includes(status as (typeof validStatuses)[number])) {
        throw new InvalidEstimateRequestError();
      }

      const result = await this.service.getEstimatesByStatus(
        status as (typeof validStatuses)[number],
      );
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };
}
