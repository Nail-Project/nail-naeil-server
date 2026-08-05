import { Request, Response, NextFunction } from 'express';
import { EstimateRequestService } from '../service/estimate-request.service';
import { CreateEstimateRequestSchema } from '../dto/request/create-estimate-request.dto';
import { GetEstimatesQuery } from '../dto/request/get-estimates-query';
import {
  EstimateRequestValidationError,
  InvalidEstimateRequestError,
} from '../error/estimate-request.error';
import { success } from '../../common/responses/api-response';

export class EstimateRequestController {
  constructor(private readonly service: EstimateRequestService) {}

  /**
   * POST /api/v1/estimate
   * 견적 요청 생성
   *
   * 1. auth 미들웨어가 JWT를 검증하고 req.userId를 주입한다.
   * 2. zod 스키마로 request body 검증
   * 3. 검증 실패 시 EstimateRequestValidationError (400) throw
   * 4. 성공 시 생성된 견적 요청 + 이미지 목록 반환 (201)
   */
  createEstimateRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = CreateEstimateRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        // zod flatten()으로 필드별 에러 메시지를 data에 담아 클라이언트에 전달한다.
        throw new EstimateRequestValidationError(parsed.error.flatten());
      }

      // auth 미들웨어가 JWT payload에서 추출해 req.userId에 주입한 값을 사용한다.
      const result = await this.service.createEstimateRequest(parsed.data, req.userId);
      res.status(201).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/estimate/:status?cursor=&size=
   * 상태별 견적 요청 목록 조회 (커서 기반 페이지네이션)
   *
   * - status 경로 파라미터로 필터링한다.
   * - 허용값: MATCHING | COMPLETED | EXPIRED | ALL
   * - ALL이면 상태 필터 없이 전체 조회한다.
   * - cursor: base64url 인코딩된 (createdAt, id) 튜플 (생략 시 첫 페이지)
   * - size: 페이지 크기 (기본값 10, 최대 100)
   * - 유효하지 않은 status 또는 query → InvalidEstimateRequestError (400)
   */
  getEstimatesByStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status } = req.params;
      const validStatuses = ['MATCHING', 'COMPLETED', 'EXPIRED', 'ALL'] as const;

      if (!validStatuses.includes(status as (typeof validStatuses)[number])) {
        throw new InvalidEstimateRequestError();
      }

      const queryParsed = GetEstimatesQuery.safeParse(req.query);
      if (!queryParsed.success) {
        throw new InvalidEstimateRequestError();
      }

      const { cursor, size } = queryParsed.data;

      const result = await this.service.getEstimatesByStatus(
        status as (typeof validStatuses)[number],
        req.userId,
        cursor,
        size,
      );
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };
}
