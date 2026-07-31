import { getPrisma } from '../../infra/prisma';
import { CreateEstimateRequestDto } from '../dto/request/create-estimate-request.dto';

export class EstimateRequestRepository {
  // shopIds로 샵 ID + 전화번호 목록 조회
  // SMS 발송 대상 정보를 가져오기 위해 사용한다.
  // phoneNumber가 null인 샵은 제외한다.
  async findShopsByIds(shopIds: number[]): Promise<{ id: number; phoneNumber: string }[]> {
    const shops = await getPrisma().shop.findMany({
      where: { id: { in: shopIds } },
      select: { id: true, phoneNumber: true },
    });
    return shops.filter((s): s is { id: number; phoneNumber: string } => s.phoneNumber !== null);
  }

  // 견적 요청 생성
  // 이미지 URL 목록을 RequestImage 레코드로 함께 생성(nested create)한다.
  // userId는 auth 미들웨어가 JWT에서 추출한 값을 controller → service → repository로 전달받는다.
  async create(dto: CreateEstimateRequestDto, userId: number) {
    const { images, shopIds: _, ...estimateData } = dto;

    return getPrisma().estimateRequest.create({
      data: {
        ...estimateData,
        // 프론트에서 문자열로 전달받은 날짜를 Date 객체로 변환한다.
        startDate: new Date(estimateData.startDate),
        endDate: new Date(estimateData.endDate),
        userId,
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
  // userId로 본인 견적만 필터링하고, status가 'ALL'이 아닌 경우 추가로 상태 필터를 건다.
  // 목록 카드에 필요한 썸네일(첫 번째 이미지), 견적 수, 최저가 계산용 proposals만 select한다.
  async findByStatus(status: 'MATCHING' | 'COMPLETED' | 'EXPIRED' | 'ALL', userId: number) {
    return getPrisma().estimateRequest.findMany({
      where: status !== 'ALL' ? { status, userId } : { userId },
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
