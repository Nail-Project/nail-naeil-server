import { getPrisma } from '../../infra/prisma';
import { CreateEstimateRequestDto } from '../dto/request/create-estimate-request.dto';
import type { EstimateRequestCursor } from '../dto/request/get-estimates-query';

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

  // designId로 카탈로그 디자인 존재 여부 확인
  // "이 디자인 그대로 견적받기" 흐름에서 클라이언트가 잘못된/삭제된 designId를 보낸 경우를 걸러낸다.
  async designExists(designId: number): Promise<boolean> {
    const design = await getPrisma().design.findUnique({
      where: { id: designId },
      select: { id: true },
    });
    return design !== null;
  }

  // 견적 요청 생성
  // 이미지 URL 목록을 RequestImage 레코드로 함께 생성(nested create)한다.
  // userId는 auth 미들웨어가 JWT에서 추출한 값을 controller → service → repository로 전달받는다.
  async create(dto: CreateEstimateRequestDto, userId: number) {
    // priceMin/priceMax는 SMS 전용이라 DB에 저장하지 않는다.
    const { images, shopIds: _, removalTypes, schedules, priceMin: _pm, priceMax: _pM, ...estimateData } = dto;

    return getPrisma().estimateRequest.create({
      data: {
        ...estimateData,
        userId,
        images: {
          create: images.map((url) => ({ imageUrl: url })),
        },
        targetShops: {
          create: dto.shopIds.map((shopId) => ({ shopId })),
        },
        // 복수 선택 제거 종류를 join table에 각각 저장한다.
        removals: {
          create: removalTypes.map((removalType) => ({ removalType })),
        },
        // 날짜별 희망 시간을 join table에 각각 row로 저장한다.
        // { date: "8/10", times: ["AM","PM"] } → (8/10, AM), (8/10, PM) 두 개 row
        schedules: {
          create: schedules.flatMap((s) =>
            s.times.map((time) => ({
              date: new Date(s.date),
              time,
            })),
          ),
        },
      },
      include: {
        images: true,
        removals: true,
        schedules: true,
      },
    });
  }

  // 진행 중(샵 매칭 중, status=MATCHING) 견적 요청 수. 마이페이지 요약에 사용한다.
  countInProgressByUser(userId: number): Promise<number> {
    return getPrisma().estimateRequest.count({
      where: { userId, status: 'MATCHING' },
    });
  }

  // 상태별 견적 요청 목록 조회 (커서 기반 페이지네이션)
  // userId로 본인 견적만 필터링하고, status가 'ALL'이 아닌 경우 추가로 상태 필터를 건다.
  // 커서는 (createdAt, id) 튜플 — createdAt이 같은 경우 id로 순서를 보장한다.
  // size+1개를 가져와 초과분이 있으면 hasNext=true로 처리한다(count 쿼리 불필요).
  async findByStatus(
    status: 'MATCHING' | 'COMPLETED' | 'EXPIRED' | 'ALL',
    userId: number,
    cursor: EstimateRequestCursor | undefined,
    size: number,
  ) {
    const baseWhere = status !== 'ALL' ? { status, userId } : { userId };

    const where = {
      ...baseWhere,
      // (createdAt, id) 둘 다 내림차순 정렬 기준과 같은 방향으로 비교해야 커서 이후 항목만 걸러진다.
      ...(cursor && {
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      }),
    };

    const rows = await getPrisma().estimateRequest.findMany({
      where,
      include: {
        // 첨부된 모든 이미지 (등록 순)
        images: {
          orderBy: { id: 'asc' },
        },
        // 견적 응답 수, SUBMITTED 샵 수, 최저가 계산에 필요한 필드만 select한다.
        proposals: {
          select: {
            totalPrice: true,
            status: true,
          },
        },
        // 제거 종류 목록
        removals: true,
        // 방문 가능 일정 목록
        schedules: {
          orderBy: [{ date: 'asc' }, { time: 'asc' }],
        },
      },
      // (createdAt, id) 모두 내림차순 — 최신 요청이 위에 오도록
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: size + 1,
    });

    const hasNext = rows.length > size;

    return { estimates: hasNext ? rows.slice(0, size) : rows, hasNext };
  }
}
