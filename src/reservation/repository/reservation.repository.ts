import { getPrisma } from '../../infra/prisma';
import type { ReservationStatus } from '../../generated/prisma/enums';
import type { ReservationCursor } from '../dto/get-reservations-request';

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
    totalPrice: number;
    shop: { name: string };
  };
}

// 예약 목록 조회 전용 select - proposalId까지 포함 (생성 응답엔 불필요)
const reservationListSelect = {
  id: true,
  proposalId: true,
  reservedAt: true,
  status: true,
  proposal: { select: { totalPrice: true, shop: { select: { name: true } } } },
} as const;

export interface ReservationRecord {
  id: bigint;
  proposalId: number;
  reservedAt: Date;
  status: ReservationStatus;
  proposal: {
    totalPrice: number;
    shop: { name: string };
  };
}

export interface ReservationDetailRecord {
  id: bigint;
  reservedAt: Date;
  status: ReservationStatus;
  proposal: {
    totalPrice: number;
    basePrice: number;
    removalPrice: number;
    extraPrice: number;
    memo: string | null;
    shop: { name: string; address: string; addressDetail: string | null };
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
  totalPrice: number;
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
    userId: bigint;
    reservedAt: Date;
  }): Promise<CreatedReservationRecord>;
  findByUserIdAndStatuses(
    userId: bigint,
    statuses: ReservationStatus[],
    cursor: ReservationCursor | undefined,
    size: number,
  ): Promise<{ reservations: ReservationRecord[]; hasNext: boolean }>;
  findByIdAndUserId(reservationId: bigint, userId: bigint): Promise<ReservationDetailRecord | null>;
  findStatusByIdAndUserId(
    reservationId: bigint,
    userId: bigint,
  ): Promise<ReservationStatusRecord | null>;
  cancel(
    reservationId: bigint,
    userId: bigint,
    reason: string,
  ): Promise<CancelledReservationRecord | null>;
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
  async create(data: {
    proposalId: number;
    timeId: number;
    userId: bigint;
    reservedAt: Date;
  }): Promise<CreatedReservationRecord> {
    const prisma = getPrisma();

    const [reservation] = await prisma.$transaction([
      prisma.reservation.create({
        data: {
          proposalId: data.proposalId,
          userId: data.userId,
          reservedAt: data.reservedAt,
          status: 'CONFIRMED',
        },
        select: createReservationSelect,
      }),
      prisma.shopProposalTime.update({
        where: { id: data.timeId },
        data: { isSelected: true },
      }),
    ]);

    return reservation;
  }

  // 상태별 예약 목록 조회 (CONFIRMED 단건 상태 또는 PAST용 COMPLETED+CANCELLED 복수 상태)
  // 커서 기반(keyset) 페이지네이션: offset 없이 "마지막으로 본 항목 이후" 조건으로 다음 페이지를 가져온다.
  // count 쿼리가 필요 없어져 트랜잭션도 더 이상 필요 없다.
  async findByUserIdAndStatuses(
    userId: bigint,
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
    userId: bigint,
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
            shop: { select: { name: true, address: true, addressDetail: true } },
          },
        },
      },
    });
  }

  // 취소 처리 전 소유권 + 현재 상태 확인용 - 상세 조회처럼 견적/샵 정보까지 조인할 필요가 없어 별도 select로 둔다.
  async findStatusByIdAndUserId(
    reservationId: bigint,
    userId: bigint,
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
    userId: bigint,
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
}
