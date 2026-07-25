import { getPrisma } from '../../infra/prisma';
import type { ReservationStatus } from '../../generated/prisma/enums';

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
    shop: { name: string; address: string; addressDetail: string | null };
  };
}

export class ReservationRepository {
  // 예약 생성용 견적(제안) 조회 - Shop 정보 포함
  async findProposalById(proposalId: number) {
    return await getPrisma().estimateResponse.findUnique({
      where: { id: proposalId },
      select: { id: true, totalPrice: true, shop: { select: { name: true } } },
    });
  }

  // 예약 생성용 예약 가능 시간 조회
  async findProposalTimeById(timeId: number) {
    return await getPrisma().shopProposalTime.findUnique({
      where: { id: timeId },
    });
  }

  // 동일 견적에 대한 중복 예약 여부 확인
  async existsByProposalId(proposalId: number) {
    const count = await getPrisma().reservation.count({ where: { proposalId } });
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
  async findByUserIdAndStatuses(
    userId: bigint,
    statuses: ReservationStatus[],
    page: number,
    size: number,
  ): Promise<{ reservations: ReservationRecord[]; totalElements: number }> {
    const where = { userId, status: { in: statuses } };

    // count와 findMany가 같은 스냅샷을 보도록 트랜잭션으로 묶는다
    // (Promise.all로 병렬 실행 시, 두 쿼리 사이에 다른 예약이 생기거나 취소되면
    // totalElements와 실제 목록이 어긋날 수 있음)
    const [reservations, totalElements] = await getPrisma().$transaction([
      getPrisma().reservation.findMany({
        where,
        select: reservationListSelect,
        orderBy: { reservedAt: 'desc' },
        skip: page * size,
        take: size,
      }),
      getPrisma().reservation.count({ where }),
    ]);

    return { reservations, totalElements };
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
            shop: { select: { name: true, address: true, addressDetail: true } },
          },
        },
      },
    });
  }
}
