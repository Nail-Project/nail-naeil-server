import { getPrisma } from '../../infra/prisma';
import type { ReservationStatus } from '../../generated/prisma/enums';
import type { ReservationCursor } from '../dto/get-reservations-request';
import { ReservationLockConflictError } from '../error/reservation.error';

// 예약 생성 응답 전용 select - CreateReservationResponse가 쓰는 필드만
const createReservationSelect = {
  id: true,
  reservedAt: true,
  status: true,
  proposal: { select: { totalPrice: true, shop: { select: { name: true } } } },
} as const;

export interface CreatedReservationRecord {
  id: bigint;
  reservedAt: Date;
  status: ReservationStatus;
  proposal: {
    totalPrice: number | null;
    shop: { name: string };
  };
}

// 예약 목록 조회 전용 select - proposalId까지 포함 (생성 응답엔 불필요)
const reservationListSelect = {
  id: true,
  proposalId: true,
  reservedAt: true,
  status: true,
  proposal: {
    select: {
      totalPrice: true,
      shop: { select: { name: true } },
      request: { select: { nailType: true, removalType: true } },
    },
  },
} as const;

export interface ReservationRecord {
  id: bigint;
  proposalId: number;
  reservedAt: Date;
  status: ReservationStatus;
  proposal: {
    totalPrice: number | null;
    shop: { name: string };
    request: { nailType: string; removalType: string };
  };
}

export interface ReservationDetailRecord {
  id: bigint;
  reservedAt: Date;
  status: ReservationStatus;
  proposal: {
    totalPrice: number | null;
    basePrice: number | null;
    removalPrice: number | null;
    extraPrice: number | null;
    memo: string | null;
    shop: {
      name: string;
      phoneNumber: string | null;
      address: string;
      addressDetail: string | null;
      rating: { toNumber(): number };
      reviewCount: number;
    };
    request: { nailType: string; removalType: string; images: { imageUrl: string }[] };
  };
}

export interface ReservationStatusRecord {
  id: bigint;
  status: ReservationStatus;
}

export interface CancelledReservationRecord {
  id: bigint;
  status: ReservationStatus;
  cancelReason: string | null;
}

export interface ProposalRecord {
  id: number;
  totalPrice: number | null;
  shop: { name: string };
}

export interface ProposalTimeRecord {
  id: number;
  proposalId: number;
  proposalDatetime: Date;
  isSelected: boolean;
}

export interface ReservationRepository {
  findProposalById(proposalId: number): Promise<ProposalRecord | null>;
  findProposalTimeById(timeId: number): Promise<ProposalTimeRecord | null>;
  existsByProposalId(proposalId: number): Promise<boolean>;
  create(data: {
    proposalId: number;
    timeId: number;
    userId: number;
    reservedAt: Date;
  }): Promise<CreatedReservationRecord>;
  findByUserIdAndStatuses(
    userId: number,
    statuses: ReservationStatus[],
    cursor: ReservationCursor | undefined,
    size: number,
  ): Promise<{ reservations: ReservationRecord[]; hasNext: boolean }>;
  findByIdAndUserId(reservationId: bigint, userId: number): Promise<ReservationDetailRecord | null>;
  findStatusByIdAndUserId(
    reservationId: bigint,
    userId: number,
  ): Promise<ReservationStatusRecord | null>;
  cancel(
    reservationId: bigint,
    userId: number,
    reason: string,
  ): Promise<CancelledReservationRecord | null>;
  countUpcomingByUser(userId: number, now: Date): Promise<number>;
}

export class PrismaReservationRepository implements ReservationRepository {
  // 예약 생성용 견적(제안) 조회 - Shop 정보 포함
  async findProposalById(proposalId: number): Promise<ProposalRecord | null> {
    return await getPrisma().estimateResponse.findUnique({
      where: { id: proposalId },
      select: { id: true, totalPrice: true, shop: { select: { name: true } } },
    });
  }

  // 예약 생성용 예약 가능 시간 조회
  async findProposalTimeById(timeId: number): Promise<ProposalTimeRecord | null> {
    return await getPrisma().shopProposalTime.findUnique({
      where: { id: timeId },
    });
  }

  // 동일 견적에 대한 중복 예약 여부 확인
  // [malibu][A1] 취소된 예약은 같은 견적으로 재예약을 허용하는 정책(2026-08-03)에 따라
  // CANCELLED 상태는 중복 판정에서 제외한다 - "취소되지 않은" 예약만 존재하면 중복으로 막는다.
  async existsByProposalId(proposalId: number): Promise<boolean> {
    const count = await getPrisma().reservation.count({
      where: { proposalId, status: { not: 'CANCELLED' } },
    });
    return count > 0;
  }

  // 예약 생성 - 선택된 시간 슬롯을 isSelected=true로 함께 반영 (견적 응답 도메인의 예약 가능 시간 조회 API가 참조하는 값)
  // [malibu][A1] proposalId의 DB unique 제약이 재예약 정책 변경으로 사라져서(2026-08-03),
  // 사전 체크(existsByProposalId)만으로는 동시 요청에 대한 TOCTOU를 막지 못한다
  // (두 요청이 거의 동시에 체크를 통과하면 둘 다 생성에 성공해 중복 CONFIRMED 예약이 생김 -
  // 10기준 리뷰에서 정확성/보안/테스트커버리지 3개 에이전트가 독립적으로 발견).
  // "아직 없는 예약 row"를 FOR UPDATE로 잠그려 하면(빈 레인지에 갭 락) MySQL/InnoDB가
  // 곧이어 실행되는 INSERT의 삽입의도락과 얽혀 데드락을 낸다(실제로 재현됨, P2034
  // "write conflict or deadlock"). 대신 이미 존재하는 EstimateResponse(견적) row
  // 자체를 잠가서, 같은 proposalId로 몰리는 동시 요청을 그 row 하나의 락으로 직렬화한다.
  async create(data: {
    proposalId: number;
    timeId: number;
    userId: number;
    reservedAt: Date;
  }): Promise<CreatedReservationRecord> {
    return getPrisma().$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM estimate_responses WHERE id = ${data.proposalId} FOR UPDATE`;

      const activeCount = await tx.reservation.count({
        where: { proposalId: data.proposalId, status: { not: 'CANCELLED' } },
      });

      if (activeCount > 0) {
        // 진짜 DB 유니크 제약 위반이 아니라 락으로 감지한 동시성 충돌이므로, 실제 Prisma
        // 에러를 흉내내지 않고 전용 신호 에러를 던진다(service에서 instanceof로 판별).
        throw new ReservationLockConflictError();
      }

      const reservation = await tx.reservation.create({
        data: {
          proposalId: data.proposalId,
          userId: data.userId,
          reservedAt: data.reservedAt,
          status: 'CONFIRMED',
        },
        select: createReservationSelect,
      });

      await tx.shopProposalTime.update({
        where: { id: data.timeId },
        data: { isSelected: true },
      });

      return reservation;
    });
  }

  // 상태별 예약 목록 조회 (CONFIRMED 단건 상태 또는 PAST용 COMPLETED+CANCELLED 복수 상태)
  // 커서 기반(keyset) 페이지네이션: offset 없이 "마지막으로 본 항목 이후" 조건으로 다음 페이지를 가져온다.
  // count 쿼리가 필요 없어져 트랜잭션도 더 이상 필요 없다.
  async findByUserIdAndStatuses(
    userId: number,
    statuses: ReservationStatus[],
    cursor: ReservationCursor | undefined,
    size: number,
  ): Promise<{ reservations: ReservationRecord[]; hasNext: boolean }> {
    const where = {
      userId,
      status: { in: statuses },
      // (reservedAt, id) 둘 다 내림차순 정렬 기준과 같은 방향으로 비교해야 커서 이후 항목만 걸러진다.
      ...(cursor && {
        OR: [
          { reservedAt: { lt: cursor.reservedAt } },
          { reservedAt: cursor.reservedAt, id: { lt: cursor.id } },
        ],
      }),
    };

    // size보다 1개 더 가져와서, 그 1개가 존재하면 다음 페이지가 있다는 뜻으로 사용한다(count 쿼리 대체).
    const rows = await getPrisma().reservation.findMany({
      where,
      select: reservationListSelect,
      orderBy: [{ reservedAt: 'desc' }, { id: 'desc' }],
      take: size + 1,
    });

    const hasNext = rows.length > size;

    return { reservations: hasNext ? rows.slice(0, size) : rows, hasNext };
  }

  // 예약 상세 조회 - 본인 예약만 조회 가능하도록 userId로 소유권 검증
  async findByIdAndUserId(
    reservationId: bigint,
    userId: number,
  ): Promise<ReservationDetailRecord | null> {
    return await getPrisma().reservation.findFirst({
      where: { id: reservationId, userId },
      select: {
        id: true,
        reservedAt: true,
        status: true,
        proposal: {
          select: {
            totalPrice: true,
            basePrice: true,
            removalPrice: true,
            extraPrice: true,
            memo: true,
            shop: {
              select: {
                name: true,
                phoneNumber: true,
                address: true,
                addressDetail: true,
                rating: true,
                reviewCount: true,
              },
            },
            request: {
              select: { nailType: true, removalType: true, images: { select: { imageUrl: true } } },
            },
          },
        },
      },
    });
  }

  // 취소 처리 전 소유권 + 현재 상태 확인용 - 상세 조회처럼 견적/샵 정보까지 조인할 필요가 없어 별도 select로 둔다.
  async findStatusByIdAndUserId(
    reservationId: bigint,
    userId: number,
  ): Promise<ReservationStatusRecord | null> {
    return await getPrisma().reservation.findFirst({
      where: { id: reservationId, userId },
      select: { id: true, status: true },
    });
  }

  // 예약 취소 - status가 CONFIRMED인 경우에만 CANCELLED로 전이시키는 조건부 업데이트.
  // updateMany의 where절에 status: 'CONFIRMED' 조건을 함께 걸어 원자적으로 처리하므로,
  // 동시에 들어온 취소 요청 중 하나만 반영되고 나머지는 count 0으로 걸러진다(경쟁 상태 안전장치).
  async cancel(
    reservationId: bigint,
    userId: number,
    reason: string,
  ): Promise<CancelledReservationRecord | null> {
    const prisma = getPrisma();

    const { count } = await prisma.reservation.updateMany({
      where: { id: reservationId, userId, status: 'CONFIRMED' },
      data: { status: 'CANCELLED', cancelReason: reason },
    });

    if (count === 0) return null;

    return await prisma.reservation.findUniqueOrThrow({
      where: { id: reservationId },
      select: { id: true, status: true, cancelReason: true },
    });
  }

  // 다가오는 예약 수: CONFIRMED이면서 예약 시각이 아직 지나지 않은(now 이후) 예약. 마이페이지 요약에 사용한다.
  async countUpcomingByUser(userId: number, now: Date): Promise<number> {
    return await getPrisma().reservation.count({
      where: { userId, status: 'CONFIRMED', reservedAt: { gte: now } },
    });
  }
}
