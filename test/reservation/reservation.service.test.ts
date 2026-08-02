import { describe, expect, it, beforeEach } from 'vitest';
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
  lastCancelArgs: { reservationId: bigint; userId: bigint; reason: string } | null = null;

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
    _userId: bigint,
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
    userId: bigint,
    reason: string,
  ): Promise<CancelledReservationRecord | null> {
    this.lastCancelArgs = { reservationId, userId, reason };
    if (this.cancelError) throw this.cancelError;
    return this.cancelResult;
  }
}

const createDto: CreateReservationRequestType = { proposalId: 1, timeId: 1 };
const userId = 1n;

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('DB 에러', { code, clientVersion: 'test' });

describe('ReservationService.createReservation', () => {
  let repository: FakeRepository;
  let service: ReservationService;

  beforeEach(() => {
    repository = new FakeRepository();
    service = new ReservationService(repository);
  });

  it('정상적으로 예약을 생성한다', async () => {
    await expect(service.createReservation(createDto, userId)).resolves.toMatchObject({
      reservationId: 100,
      shopName: '영찬 네일 강남점',
      totalPrice: 55_000,
      status: 'CONFIRMED',
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
    service = new ReservationService(repository);
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
          proposal: { totalPrice: 55_000, shop: { name: '영찬 네일 강남점' } },
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
          shopThumbnailUrl: null,
          totalPrice: 55_000,
        },
      ],
      pageInfo: { nextCursor: null, hasNext: false },
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
          proposal: { totalPrice: 55_000, shop: { name: '영찬 네일 강남점' } },
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
    service = new ReservationService(repository);
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
        extraPrice: 10_000,
        memo: '깔끔하게 해드릴게요',
        shop: { name: '영찬 네일 강남점', address: '서울시 강남구', addressDetail: '2층' },
      },
    };

    await expect(service.getReservationDetail(1n, userId)).resolves.toMatchObject({
      reservationId: 1,
      shopName: '영찬 네일 강남점',
      address: '서울시 강남구 2층',
      basePrice: 40_000,
      removalPrice: 5_000,
      extraPrice: 10_000,
      totalPrice: 55_000,
      shopComment: '깔끔하게 해드릴게요',
      status: 'CONFIRMED',
    });
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
        extraPrice: 10_000,
        memo: null,
        shop: { name: '영찬 네일 강남점', address: '서울시 강남구', addressDetail: null },
      },
    };

    await expect(service.getReservationDetail(1n, userId)).resolves.toMatchObject({
      address: '서울시 강남구',
      shopComment: null,
    });
  });
});

describe('ReservationService.cancelReservation', () => {
  let repository: FakeRepository;
  let service: ReservationService;

  beforeEach(() => {
    repository = new FakeRepository();
    service = new ReservationService(repository);
  });

  it('정상적으로 예약을 취소한다', async () => {
    await expect(
      service.cancelReservation(1n, userId, '개인 사정으로 인해 취소할게요'),
    ).resolves.toMatchObject({
      reservationId: 1,
      status: 'CANCELLED',
      cancelReason: '개인 사정으로 인해 취소할게요',
    });

    expect(repository.lastCancelArgs).toEqual({
      reservationId: 1n,
      userId,
      reason: '개인 사정으로 인해 취소할게요',
    });
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
});
