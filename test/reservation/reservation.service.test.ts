import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Prisma } from '../../src/generated/prisma/client';
import type { ReservationStatus } from '../../src/generated/prisma/enums';
import type {
  CancelledReservationRecord,
  CreatedReservationRecord,
  ProposalRecord,
  ProposalTimeRecord,
  ReservationDetailRecord,
  ReservationRecord,
  ReservationRepository,
  ReservationStatusRecord,
} from '../../src/reservation/repository/reservation.repository';
import { ReservationService } from '../../src/reservation/service/reservation.service';
import type { NotificationService } from '../../src/notification/service/notification.service';
import { ReservationLockConflictError } from '../../src/reservation/error/reservation.error';

// 예약 확정/취소 시 호출되는 알림 서비스는 fake로 주입해 DB를 타지 않게 한다.
const fakeNotificationService = () =>
  ({ notify: vi.fn().mockResolvedValue(undefined) }) as unknown as NotificationService;
import type { CreateReservationRequestType } from '../../src/reservation/dto/create-reservation-request';
import type { ReservationCursor } from '../../src/reservation/dto/get-reservations-request';
import { encodeCursor } from '../../src/common/pagination/cursor';

const TOMORROW = new Date(Date.now() + 1000 * 60 * 60 * 24);
const YESTERDAY = new Date(Date.now() - 1000 * 60 * 60 * 24);

class FakeRepository implements ReservationRepository {
  proposal: ProposalRecord | null = {
    id: 1,
    totalPrice: 55_000,
    shop: { name: '영찬 네일 강남점' },
  };

  proposalTime: ProposalTimeRecord | null = {
    id: 1,
    proposalId: 1,
    proposalDatetime: TOMORROW,
    isSelected: false,
  };

  alreadyReserved = false;
  createError: unknown = null;
  createResult: CreatedReservationRecord = {
    id: 100n,
    reservedAt: TOMORROW,
    status: 'CONFIRMED',
    proposal: { totalPrice: 55_000, shop: { name: '영찬 네일 강남점' } },
  };

  reservationsResult: { reservations: ReservationRecord[]; hasNext: boolean } = {
    reservations: [],
    hasNext: false,
  };
  detailResult: ReservationDetailRecord | null = null;

  statusResult: ReservationStatusRecord | null = { id: 1n, status: 'CONFIRMED' };
  cancelResult: CancelledReservationRecord | null = {
    id: 1n,
    status: 'CANCELLED',
    cancelReason: '개인 사정으로 인해 취소할게요',
  };
  cancelError: unknown = null;
  lastCancelArgs: { reservationId: bigint; userId: number; reason: string } | null = null;

  lastStatuses: ReservationStatus[] | null = null;
  lastCursor: ReservationCursor | undefined = undefined;

  async findProposalById(): Promise<ProposalRecord | null> {
    return this.proposal;
  }

  async findProposalTimeById(): Promise<ProposalTimeRecord | null> {
    return this.proposalTime;
  }

  async existsByProposalId(): Promise<boolean> {
    return this.alreadyReserved;
  }

  async create(): Promise<CreatedReservationRecord> {
    if (this.createError) throw this.createError;
    return this.createResult;
  }

  async findByUserIdAndStatuses(
    _userId: number,
    statuses: ReservationStatus[],
    cursor: ReservationCursor | undefined,
  ): Promise<{ reservations: ReservationRecord[]; hasNext: boolean }> {
    this.lastStatuses = statuses;
    this.lastCursor = cursor;
    return this.reservationsResult;
  }

  async findByIdAndUserId(): Promise<ReservationDetailRecord | null> {
    return this.detailResult;
  }

  async findStatusByIdAndUserId(): Promise<ReservationStatusRecord | null> {
    return this.statusResult;
  }

  async cancel(
    reservationId: bigint,
    userId: number,
    reason: string,
  ): Promise<CancelledReservationRecord | null> {
    this.lastCancelArgs = { reservationId, userId, reason };
    if (this.cancelError) throw this.cancelError;
    return this.cancelResult;
  }

  upcomingCount = 0;

  async countUpcomingByUser(): Promise<number> {
    return this.upcomingCount;
  }
}

const createDto: CreateReservationRequestType = { proposalId: 1, timeId: 1 };
const userId = 1;

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('DB 에러', { code, clientVersion: 'test' });

describe('ReservationService.createReservation', () => {
  let repository: FakeRepository;
  let service: ReservationService;

  beforeEach(() => {
    repository = new FakeRepository();
    service = new ReservationService(repository, fakeNotificationService());
  });

  it('정상적으로 예약을 생성한다', async () => {
    await expect(service.createReservation(createDto, userId)).resolves.toMatchObject({
      reservationId: 100,
      shopName: '영찬 네일 강남점',
      totalPrice: 55_000,
      status: 'CONFIRMED',
    });
  });

  it('예약 확정 시 RESERVATION_CONFIRMED 알림을 보낸다', async () => {
    const notificationService = fakeNotificationService();
    const svc = new ReservationService(repository, notificationService);

    await svc.createReservation(createDto, userId);

    expect(notificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId, type: 'RESERVATION_CONFIRMED' }),
    );
  });

  it('알림 발송이 실패해도 예약 생성은 성공한다(격리)', async () => {
    const notificationService = {
      notify: vi.fn().mockRejectedValue(new Error('notify down')),
    } as unknown as NotificationService;
    const svc = new ReservationService(repository, notificationService);

    await expect(svc.createReservation(createDto, userId)).resolves.toMatchObject({
      reservationId: 100,
    });
  });

  it('존재하지 않는 견적이면 404를 던진다', async () => {
    repository.proposal = null;

    await expect(service.createReservation(createDto, userId)).rejects.toMatchObject({
      code: 'PROPOSAL_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('존재하지 않는 예약 시간이면 404를 던진다', async () => {
    repository.proposalTime = null;

    await expect(service.createReservation(createDto, userId)).rejects.toMatchObject({
      code: 'PROPOSAL_TIME_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('다른 견적 소속의 시간이면 404를 던진다', async () => {
    repository.proposalTime = { ...repository.proposalTime!, proposalId: 999 };

    await expect(service.createReservation(createDto, userId)).rejects.toMatchObject({
      code: 'PROPOSAL_TIME_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('이미 지난 시간이면 404를 던진다', async () => {
    repository.proposalTime = { ...repository.proposalTime!, proposalDatetime: YESTERDAY };

    await expect(service.createReservation(createDto, userId)).rejects.toMatchObject({
      code: 'PROPOSAL_TIME_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('이미 예약된 견적이면 409를 던진다 (사전 체크)', async () => {
    repository.alreadyReserved = true;

    await expect(service.createReservation(createDto, userId)).rejects.toMatchObject({
      code: 'ALREADY_RESERVED',
      statusCode: 409,
    });
  });

  it('사전 체크 통과 후 DB unique 제약 위반(P2002)이면 409를 던진다', async () => {
    repository.createError = prismaError('P2002');

    await expect(service.createReservation(createDto, userId)).rejects.toMatchObject({
      code: 'ALREADY_RESERVED',
      statusCode: 409,
    });
  });

  it('사전 체크 통과 후 견적 row 락으로 동시 예약이 감지되면(ReservationLockConflictError) 409를 던진다', async () => {
    repository.createError = new ReservationLockConflictError();

    await expect(service.createReservation(createDto, userId)).rejects.toMatchObject({
      code: 'ALREADY_RESERVED',
      statusCode: 409,
    });
  });

  it('생성 시점에 시간 slot이 사라졌으면(P2025) 404를 던진다', async () => {
    repository.createError = prismaError('P2025');

    await expect(service.createReservation(createDto, userId)).rejects.toMatchObject({
      code: 'PROPOSAL_TIME_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('알 수 없는 에러는 500으로 변환하고 원본 에러를 data에 담는다', async () => {
    const originalError = new Error('예상치 못한 DB 오류');
    repository.createError = originalError;

    await expect(service.createReservation(createDto, userId)).rejects.toMatchObject({
      code: 'RESERVATION_FAILED',
      statusCode: 500,
      data: { originalError },
    });
  });
});

describe('ReservationService.getReservations', () => {
  let repository: FakeRepository;
  let service: ReservationService;

  beforeEach(() => {
    repository = new FakeRepository();
    service = new ReservationService(repository, fakeNotificationService());
  });

  it('CONFIRMED 상태는 CONFIRMED만 조회한다', async () => {
    await service.getReservations('CONFIRMED', userId, undefined, 10);

    expect(repository.lastStatuses).toEqual(['CONFIRMED']);
  });

  it('PAST 상태는 COMPLETED와 CANCELLED를 함께 조회한다', async () => {
    await service.getReservations('PAST', userId, undefined, 10);

    expect(repository.lastStatuses).toEqual(['COMPLETED', 'CANCELLED']);
  });

  it('요청한 cursor를 그대로 repository에 전달한다', async () => {
    const cursor: ReservationCursor = { reservedAt: TOMORROW, id: 5n };

    await service.getReservations('CONFIRMED', userId, cursor, 10);

    expect(repository.lastCursor).toEqual(cursor);
  });

  it('예약 목록을 응답 형식에 맞게 매핑한다', async () => {
    repository.reservationsResult = {
      reservations: [
        {
          id: 100n,
          proposalId: 1,
          reservedAt: TOMORROW,
          status: 'CONFIRMED',
          proposal: {
            totalPrice: 55_000,
            shop: {
              name: '영찬 네일 강남점',
              thumbnailImageUrl: 'https://example.com/shop-thumb.jpg',
            },
            request: {
              nailType: 'HAND',
              removalType: 'NONE',
              design: {
                title: '도트 프렌치 네일',
                tags: [{ tag: { name: '프렌치' } }, { tag: { name: '심플' } }],
              },
            },
          },
        },
      ],
      hasNext: false,
    };

    const result = await service.getReservations('CONFIRMED', userId, undefined, 10);

    expect(result).toMatchObject({
      reservations: [
        {
          reservationId: 100,
          proposalId: 1,
          status: 'CONFIRMED',
          shopName: '영찬 네일 강남점',
          shopThumbnailUrl: 'https://example.com/shop-thumb.jpg',
          totalPrice: 55_000,
          nailType: 'HAND',
          removalType: 'NONE',
          designName: '도트 프렌치 네일',
          designTags: ['프렌치', '심플'],
        },
      ],
      pageInfo: { nextCursor: null, hasNext: false },
    });
  });

  it('직접 사진을 올려 요청한 예약이면 디자인명과 태그가 모두 비어있다', async () => {
    repository.reservationsResult = {
      reservations: [
        {
          id: 100n,
          proposalId: 1,
          reservedAt: TOMORROW,
          status: 'CONFIRMED',
          proposal: {
            totalPrice: 55_000,
            shop: { name: '영찬 네일 강남점', thumbnailImageUrl: null },
            request: { nailType: 'HAND', removalType: 'NONE', design: null },
          },
        },
      ],
      hasNext: false,
    };

    const result = await service.getReservations('CONFIRMED', userId, undefined, 10);

    expect(result.reservations[0]).toMatchObject({
      designName: null,
      designTags: [],
    });
  });

  it('다음 페이지가 있으면 마지막 항목 기준으로 nextCursor를 만든다', async () => {
    repository.reservationsResult = {
      reservations: [
        {
          id: 100n,
          proposalId: 1,
          reservedAt: TOMORROW,
          status: 'CONFIRMED',
          proposal: {
            totalPrice: 55_000,
            shop: { name: '영찬 네일 강남점', thumbnailImageUrl: null },
            request: { nailType: 'HAND', removalType: 'NONE', design: null },
          },
        },
      ],
      hasNext: true,
    };

    const result = await service.getReservations('CONFIRMED', userId, undefined, 10);

    expect(result.pageInfo.hasNext).toBe(true);
    expect(result.pageInfo.nextCursor).toBe(
      encodeCursor({ reservedAt: TOMORROW.toISOString(), id: '100' }),
    );
  });
});

describe('ReservationService.getReservationDetail', () => {
  let repository: FakeRepository;
  let service: ReservationService;

  beforeEach(() => {
    repository = new FakeRepository();
    service = new ReservationService(repository, fakeNotificationService());
  });

  it('존재하지 않는 예약이면 404를 던진다', async () => {
    repository.detailResult = null;

    await expect(service.getReservationDetail(1n, userId)).rejects.toMatchObject({
      code: 'RESERVATION_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('상세 주소가 있으면 주소와 상세주소를 합쳐서 반환한다', async () => {
    repository.detailResult = {
      id: 1n,
      reservedAt: TOMORROW,
      status: 'CONFIRMED',
      proposal: {
        totalPrice: 55_000,
        basePrice: 40_000,
        removalPrice: 5_000,
        designExtraPrice: 6_000,
        optionExtraPrice: 4_000,
        memo: '깔끔하게 해드릴게요',
        shop: {
          name: '영찬 네일 강남점',
          phoneNumber: '02-1234-5678',
          address: '서울시 강남구',
          addressDetail: '2층',
          rating: { toNumber: () => 4.5 },
          reviewCount: 12,
          latitude: { toNumber: () => 37.4979 },
          longitude: { toNumber: () => 127.0276 },
          thumbnailImageUrl: 'https://example.com/shop-thumb.jpg',
          businessHours: { mon: '10:00-20:00' },
          closedDays: ['SUN'],
        },
        request: {
          nailType: 'HAND',
          removalType: 'PARTS',
          images: [{ imageUrl: 'https://example.com/a.jpg' }],
          design: null,
        },
      },
    };

    await expect(service.getReservationDetail(1n, userId)).resolves.toMatchObject({
      reservationId: 1,
      shopName: '영찬 네일 강남점',
      shopPhoneNumber: '02-1234-5678',
      address: '서울시 강남구 2층',
      addressDetail: '2층',
      shopRating: 4.5,
      shopReviewCount: 12,
      latitude: 37.4979,
      longitude: 127.0276,
      shopThumbnailUrl: 'https://example.com/shop-thumb.jpg',
      shopBusinessHours: { mon: '10:00-20:00' },
      shopClosedDays: ['SUN'],
      distanceMeters: null,
      basePrice: 40_000,
      removalPrice: 5_000,
      designExtraPrice: 6_000,
      optionExtraPrice: 4_000,
      couponDiscount: 0,
      totalPrice: 55_000,
      shopComment: '깔끔하게 해드릴게요',
      nailType: 'HAND',
      removalType: 'PARTS',
      images: ['https://example.com/a.jpg'],
      status: 'CONFIRMED',
    });
  });

  it('위도/경도가 함께 전달되면 샵과의 거리를 계산해 반환한다', async () => {
    repository.detailResult = {
      id: 1n,
      reservedAt: TOMORROW,
      status: 'CONFIRMED',
      proposal: {
        totalPrice: 55_000,
        basePrice: 40_000,
        removalPrice: 5_000,
        designExtraPrice: 6_000,
        optionExtraPrice: 4_000,
        memo: null,
        shop: {
          name: '영찬 네일 강남점',
          phoneNumber: null,
          address: '서울시 강남구',
          addressDetail: null,
          rating: { toNumber: () => 4.5 },
          reviewCount: 12,
          latitude: { toNumber: () => 37.4979 },
          longitude: { toNumber: () => 127.0276 },
          thumbnailImageUrl: null,
          businessHours: null,
          closedDays: null,
        },
        request: { nailType: 'HAND', removalType: 'NONE', images: [], design: null },
      },
    };

    // 같은 좌표면 거리는 0
    await expect(
      service.getReservationDetail(1n, userId, 37.4979, 127.0276),
    ).resolves.toMatchObject({ distanceMeters: 0 });

    // 다른 좌표면 0보다 큰 거리가 나온다
    const result = await service.getReservationDetail(1n, userId, 37.5, 127.0);
    expect(result.distanceMeters).not.toBeNull();
    expect(result.distanceMeters).toBeGreaterThan(0);
  });

  it('위도만 전달되고 경도가 없으면 거리를 계산하지 않는다', async () => {
    repository.detailResult = {
      id: 1n,
      reservedAt: TOMORROW,
      status: 'CONFIRMED',
      proposal: {
        totalPrice: 55_000,
        basePrice: 40_000,
        removalPrice: 5_000,
        designExtraPrice: 6_000,
        optionExtraPrice: 4_000,
        memo: null,
        shop: {
          name: '영찬 네일 강남점',
          phoneNumber: null,
          address: '서울시 강남구',
          addressDetail: null,
          rating: { toNumber: () => 4.5 },
          reviewCount: 12,
          latitude: { toNumber: () => 37.4979 },
          longitude: { toNumber: () => 127.0276 },
          thumbnailImageUrl: null,
          businessHours: null,
          closedDays: null,
        },
        request: { nailType: 'HAND', removalType: 'NONE', images: [], design: null },
      },
    };

    await expect(
      service.getReservationDetail(1n, userId, 37.4979, undefined),
    ).resolves.toMatchObject({ distanceMeters: null });
  });

  it('상세 주소가 없으면 기본 주소만 반환한다', async () => {
    repository.detailResult = {
      id: 1n,
      reservedAt: TOMORROW,
      status: 'CONFIRMED',
      proposal: {
        totalPrice: 55_000,
        basePrice: 40_000,
        removalPrice: 5_000,
        designExtraPrice: 6_000,
        optionExtraPrice: 4_000,
        memo: null,
        shop: {
          name: '영찬 네일 강남점',
          phoneNumber: null,
          address: '서울시 강남구',
          addressDetail: null,
          rating: { toNumber: () => 0 },
          reviewCount: 0,
          latitude: { toNumber: () => 37.4979 },
          longitude: { toNumber: () => 127.0276 },
          thumbnailImageUrl: null,
          businessHours: null,
          closedDays: null,
        },
        request: { nailType: 'PEDICURE', removalType: 'NONE', images: [], design: null },
      },
    };

    await expect(service.getReservationDetail(1n, userId)).resolves.toMatchObject({
      address: '서울시 강남구',
      addressDetail: null,
      shopPhoneNumber: null,
      shopRating: 0,
      shopReviewCount: 0,
      removalType: 'NONE',
      shopComment: null,
      images: [],
    });
  });
});

describe('ReservationService.cancelReservation', () => {
  let repository: FakeRepository;
  let service: ReservationService;

  beforeEach(() => {
    repository = new FakeRepository();
    service = new ReservationService(repository, fakeNotificationService());
  });

  it('정상적으로 예약을 취소한다', async () => {
    await expect(
      service.cancelReservation(1n, userId, '개인 사정으로 인해 취소할게요'),
    ).resolves.toBeUndefined();

    expect(repository.lastCancelArgs).toEqual({
      reservationId: 1n,
      userId,
      reason: '개인 사정으로 인해 취소할게요',
    });
  });

  it('예약 취소 시 RESERVATION_CANCELLED 알림을 보낸다', async () => {
    const notificationService = fakeNotificationService();
    const svc = new ReservationService(repository, notificationService);

    await svc.cancelReservation(1n, userId, '개인 사정으로 인해 취소할게요');

    expect(notificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId, type: 'RESERVATION_CANCELLED' }),
    );
  });

  it('존재하지 않거나 본인 소유가 아닌 예약이면 404를 던진다', async () => {
    repository.statusResult = null;

    await expect(service.cancelReservation(1n, userId, '기타')).rejects.toMatchObject({
      code: 'RESERVATION_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('이미 취소된 예약이면 409를 던진다', async () => {
    repository.statusResult = { id: 1n, status: 'CANCELLED' };

    await expect(service.cancelReservation(1n, userId, '기타')).rejects.toMatchObject({
      code: 'RESERVATION_ALREADY_FINALIZED',
      statusCode: 409,
    });
  });

  it('이미 완료된 예약이면 409를 던진다', async () => {
    repository.statusResult = { id: 1n, status: 'COMPLETED' };

    await expect(service.cancelReservation(1n, userId, '기타')).rejects.toMatchObject({
      code: 'RESERVATION_ALREADY_FINALIZED',
      statusCode: 409,
    });
  });

  it('사전 체크 통과 후 동시 취소 경쟁 상태로 반영이 안 됐으면(count 0) 409를 던진다', async () => {
    repository.cancelResult = null;

    await expect(service.cancelReservation(1n, userId, '기타')).rejects.toMatchObject({
      code: 'RESERVATION_ALREADY_FINALIZED',
      statusCode: 409,
    });
  });

  it('취소 처리 중 알 수 없는 에러는 500으로 변환하고 원본 에러를 data에 담는다', async () => {
    const originalError = new Error('예상치 못한 DB 오류');
    repository.cancelError = originalError;

    await expect(service.cancelReservation(1n, userId, '기타')).rejects.toMatchObject({
      code: 'RESERVATION_FAILED',
      statusCode: 500,
      data: { originalError },
    });
  });

  it('카탈로그 디자인 그대로 견적받은 예약이면 디자인명을 반환한다', async () => {
    repository.detailResult = {
      id: 1n,
      reservedAt: TOMORROW,
      status: 'CONFIRMED',
      proposal: {
        totalPrice: 55_000,
        basePrice: 40_000,
        removalPrice: 5_000,
        designExtraPrice: 6_000,
        optionExtraPrice: 4_000,
        memo: null,
        shop: {
          name: '영찬 네일 강남점',
          phoneNumber: null,
          address: '서울시 강남구',
          addressDetail: null,
          rating: { toNumber: () => 0 },
          reviewCount: 0,
          latitude: { toNumber: () => 37.4979 },
          longitude: { toNumber: () => 127.0276 },
          thumbnailImageUrl: null,
          businessHours: null,
          closedDays: null,
        },
        request: {
          nailType: 'HAND',
          removalType: 'NONE',
          images: [],
          design: { title: '도트 프렌치 네일' },
        },
      },
    };

    await expect(service.getReservationDetail(1n, userId)).resolves.toMatchObject({
      designName: '도트 프렌치 네일',
    });
  });

  it('직접 사진을 올려 요청한 예약이면 디자인명은 null이다', async () => {
    repository.detailResult = {
      id: 1n,
      reservedAt: TOMORROW,
      status: 'CONFIRMED',
      proposal: {
        totalPrice: 55_000,
        basePrice: 40_000,
        removalPrice: 5_000,
        designExtraPrice: 6_000,
        optionExtraPrice: 4_000,
        memo: null,
        shop: {
          name: '영찬 네일 강남점',
          phoneNumber: null,
          address: '서울시 강남구',
          addressDetail: null,
          rating: { toNumber: () => 0 },
          reviewCount: 0,
          latitude: { toNumber: () => 37.4979 },
          longitude: { toNumber: () => 127.0276 },
          thumbnailImageUrl: null,
          businessHours: null,
          closedDays: null,
        },
        request: { nailType: 'HAND', removalType: 'NONE', images: [], design: null },
      },
    };

    await expect(service.getReservationDetail(1n, userId)).resolves.toMatchObject({
      designName: null,
    });
  });
});
