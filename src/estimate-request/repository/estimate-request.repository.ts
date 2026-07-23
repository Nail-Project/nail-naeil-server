import { getPrisma } from '../../infra/prisma';
import { CreateEstimateRequestDto } from '../dto/request/create-estimate-request.dto';

export class EstimateRequestRepository {
  // 견적 요청 생성
  // 이미지 URL 목록을 RequestImage 레코드로 함께 생성(nested create)한다.
  async create(dto: CreateEstimateRequestDto) {
    const { images, ...estimateData } = dto;

    return getPrisma().estimateRequest.create({
      data: {
        ...estimateData,
        // 프론트에서 문자열로 전달받은 날짜를 Date 객체로 변환한다.
        startDate: new Date(estimateData.startDate),
        endDate: new Date(estimateData.endDate),
        // TODO: [yej] 로그인 구현 후 토큰에서 추출한 userId로 교체
        userId: 1,
        images: {
          create: images.map((url) => ({ imageUrl: url })),
        },
      },
      include: {
        // 생성된 이미지 레코드를 응답에 포함하기 위해 join한다.
        images: true,
      },
    });
  }

  // 상태별 견적 요청 목록 조회
  // status가 'ALL'이면 where 조건 없이 전체를 조회한다.
  // 목록 카드에 필요한 썸네일(첫 번째 이미지), 견적 수, 최저가 계산용 proposals만 select한다.
  async findByStatus(status: 'MATCHING' | 'COMPLETED' | 'EXPIRED' | 'ALL') {
    return getPrisma().estimateRequest.findMany({
      where: status !== 'ALL' ? { status } : undefined,
      include: {
        // 썸네일은 가장 먼저 등록된 이미지 1장만 가져온다.
        images: {
          take: 1,
          orderBy: { id: 'asc' },
        },
        // 견적 응답 수, SUBMITTED 샵 수, 최저가 계산에 필요한 필드만 select한다.
        proposals: {
          select: {
            totalPrice: true,
            // 팀원 스키마의 EstimateResponseStatus: SUBMITTED | ACCEPTED | REJECTED
            status: true,
          },
        },
      },
      // 최신 요청이 위에 오도록 내림차순 정렬
      orderBy: { createdAt: 'desc' },
    });
  }
}
