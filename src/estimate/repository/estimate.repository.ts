import { prisma } from '../../infra/prisma';
import { CreateEstimateRequestType } from '../dto/create-estimate-request';

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

  // 견적 결과 상세 조회
  // rating, reviewCount, distance는 현재 Shop 테이블에 없으므로 추후 스키마 확장 후 추가 예정이다.
  async findResultByRequestId(requestId: bigint) {
    // 견적 요청 + 제안 목록 + 제안별 Shop 정보 + 제안별 가능 시간 한 번에 조회
    return await prisma.estimateRequest.findUnique({
      where: { id: requestId },
      include: {
        proposals: {
          include: {
            // @relation으로 Shop 자동 join
            shop: true,
            // 제안별 가능한 예약 시간 목록
            times: true,
          },
        },
      },
    });
  }

  // 샵 견적별 예약 가능 시간 조회
  // proposal_id가 존재하지 않으면 null 반환 (서비스에서 404 처리)
  async findTimesByProposalId(proposalId: bigint) {
    return await prisma.estimateResponse.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        // 해당 견적 제안의 예약 가능 시간 목록
        times: {
          select: {
            id: true,
            proposalDatetime: true,
            isSelected: true,
          },
          orderBy: { proposalDatetime: 'asc' },
        },
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
