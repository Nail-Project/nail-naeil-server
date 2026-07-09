import { PrismaClient } from '../../../generated/prisma';
import { CreateEstimateRequestType } from '../dtos/estimate.dto';

const prisma = new PrismaClient();

export class EstimateRepository {
  // 견적 요청 생성 (이미지 URL 리스트 포함)
  async create(data: CreateEstimateRequestType) {
    const { images, ...estimateData } = data;

    return await prisma.estimateRequest.create({
      data: {
        ...estimateData,
        startDate: new Date(estimateData.startDate),
        endDate: new Date(estimateData.endDate),
        // TODO: 로그인 구현 후 토큰에서 userId 추출하여 교체
        userId: 1n,
        images: {
          create: images.map((url) => ({ imageUrl: url })),
        },
      },
      include: {
        images: true,
      },
    });
  }

  // 상태별 견적 목록 조회 (ALL이면 전체 조회)
  async findByStatus(status: 'MATCHING' | 'COMPLETED' | 'EXPIRED' | 'ALL') {
    return await prisma.estimateRequest.findMany({
      where: status !== 'ALL' ? { status } : undefined,
      include: {
        // 썸네일용 첫 번째 이미지만 조회
        images: {
          take: 1,
          orderBy: { id: 'asc' },
        },
        // 견적 수, 대기 중인 샵 수, 최저가 계산용
        proposals: {
          select: {
            totalPrice: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
