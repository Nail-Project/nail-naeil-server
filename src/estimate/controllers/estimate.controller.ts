import { Router, Request, Response } from 'express';
import { estimateService } from '../services/estimate.service';
import { CreateEstimateRequest, GetEstimatesQuery } from '../dtos/estimate.dto';

const router = Router();

/**
 * POST /api/v1/estimates
 * 견적 요청 생성
 */
router.post('/', async (req: Request, res: Response) => {
  // 요청 바디 유효성 검사
  const parsed = CreateEstimateRequest.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      isSuccess: false,
      code: 400,
      message: '유효하지 않은 요청입니다.',
    });
  }

  try {
    const result = await estimateService.createEstimate(parsed.data);

    // Prisma BigInt → Number 변환 후 응답 형태로 가공
    return res.status(201).json({
      isSuccess: true,
      code: 201,
      message: '견적 요청이 성공적으로 생성되었습니다.',
      data: {
        estimateId: Number(result.id),
        nailType: result.nailType,
        removalType: result.removalType,
        startDate: result.startDate,
        endDate: result.endDate,
        preferredTime: result.preferredTime,
        recommendType: result.recommendType,
        description: result.description ?? null,
        status: result.status,
        images: result.images.map((img) => ({
          imageId: Number(img.id),
          imageUrl: img.imageUrl,
        })),
        createdAt: result.createdAt,
      },
    });
  } catch {
    return res.status(500).json({
      isSuccess: false,
      code: 500,
      message: '예상치 못한 서버 오류가 발생했습니다.',
    });
  }
});

/**
 * GET /api/v1/estimates?status=
 * 상태별 견적 목록 조회
 * status 없으면 전체 조회 (ALL)
 */
router.get('/', async (req: Request, res: Response) => {
  // 쿼리 스트링 유효성 검사
  const parsed = GetEstimatesQuery.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      isSuccess: false,
      code: 400,
      message: '유효하지 않은 상태값입니다.',
    });
  }

  try {
    const result = await estimateService.getEstimatesByStatus(parsed.data.status);

    return res.status(200).json({
      isSuccess: true,
      code: 200,
      message: '요청이 성공적으로 처리되었습니다.',
      data: result,
    });
  } catch {
    return res.status(500).json({
      isSuccess: false,
      code: 500,
      message: '예상치 못한 서버 오류가 발생했습니다.',
    });
  }
});

export default router;
