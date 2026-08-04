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
  async existsByProposalId(proposalId: number): Promise<boolean> {
    const count = await getPrisma().reservation.count({ where: { proposalId } });
    return count > 0;
  }

  // 예약 생성 - 선택된 시간 슬롯을 isSelected=true로 함께 반영 (견적 응답 도메인의 예약 가능 시간 조회 API가 참조하는 값)
  async create(data: {
    proposalId: number;
    timeId: number;
    userId: number;
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
            shop: { select: { name: true, address: true, addressDetail: true } },
          },
        },
      },
    });
  }
}
