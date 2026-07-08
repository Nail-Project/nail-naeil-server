import { Router } from 'express';
import { estimateService } from '../services/estimate.service.js';
import { CreateEstimateRequest } from '../dtos/estimate.dto.js';

const router = Router();

router.post('/', async (req, res) => {
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

export default router;
