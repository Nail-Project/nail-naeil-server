import { Prisma } from '../../generated/prisma/client';
import type { ReservationStatus } from '../../generated/prisma/enums';
import { ReservationRepository } from '../repository/reservation.repository';
import { CreateReservationRequestType } from '../dto/create-reservation-request';
import { CreateReservationResponse } from '../dto/create-reservation-response';
import { GetReservationsResponse } from '../dto/get-reservations-response';
import { GetReservationDetailResponse } from '../dto/get-reservation-detail-response';
import { ReservationFailedError } from '../../common/errors/common.error';
import {
  AlreadyReservedError,
  ProposalNotFoundError,
  ProposalTimeNotFoundError,
  ReservationNotFoundError,
} from '../error/reservation.error';

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

export class ReservationService {
  private readonly reservationRepository = new ReservationRepository();

  // 예약 생성
  async createReservation(
    dto: CreateReservationRequestType,
    userId: bigint,
  ): Promise<CreateReservationResponse> {
    const { proposalId, proposalTimeId } = dto;

    // 존재하지 않는 견적 id인 경우 404
    const proposal = await this.reservationRepository.findProposalById(proposalId);
    if (!proposal) throw new ProposalNotFoundError();

    // 존재하지 않거나 해당 견적 소속이 아닌 시간 id인 경우 404
    const proposalTime = await this.reservationRepository.findProposalTimeById(proposalTimeId);
    if (!proposalTime || proposalTime.proposalId !== proposalId) {
      throw new ProposalTimeNotFoundError();
    }

    // 동일 견적에 대한 중복 예약인 경우 409 (사전 체크 - 일반적인 경우 빠르게 차단)
    const alreadyReserved = await this.reservationRepository.existsByProposalId(proposalId);
    if (alreadyReserved) throw new AlreadyReservedError();

    try {
      const result = await this.reservationRepository.create({
        proposalId,
        proposalTimeId,
        userId,
        reservedAt: proposalTime.proposalDatetime,
      });

      return {
        reservationId: Number(result.id),
        shopName: result.proposal.shop.name,
        reservedAt: result.reservedAt,
        totalPrice: result.proposal.totalPrice,
        status: result.status,
      };
    } catch (error) {
      // DB unique 제약조건 위반 - 사전 체크와 생성 사이의 경쟁 상태로 중복 예약된 경우
      if (isUniqueConstraintError(error)) throw new AlreadyReservedError();
      throw new ReservationFailedError();
    }
  }

  // 확정(CONFIRMED)/지난(PAST=COMPLETED+CANCELLED) 예약 목록 조회
  async getReservations(
    status: 'CONFIRMED' | 'PAST',
    userId: bigint,
    page: number,
    size: number,
  ): Promise<GetReservationsResponse> {
    const statuses: ReservationStatus[] =
      status === 'CONFIRMED' ? ['CONFIRMED'] : ['COMPLETED', 'CANCELLED'];

    try {
      const { reservations, totalElements } =
        await this.reservationRepository.findByUserIdAndStatuses(userId, statuses, page, size);

      return {
        reservations: reservations.map((r) => ({
          reservationId: Number(r.id),
          reservedAt: r.reservedAt,
          status: r.status,
          shopName: r.proposal.shop.name,
          // TODO: [malibu] Design 모델 추가 후 연결 예정
          designName: null,
          // TODO: [malibu] EstimateRequest 모델(feat/estimate_request) 병합 후 연결 예정
          thumbnailUrl: null,
          totalPrice: r.proposal.totalPrice,
        })),
        page,
        totalElements,
      };
    } catch {
      throw new ReservationFailedError();
    }
  }

  // 예약 상세 조회
  async getReservationDetail(
    reservationId: bigint,
    userId: bigint,
  ): Promise<GetReservationDetailResponse> {
    const reservation = await this.reservationRepository.findByIdAndUserId(reservationId, userId);
    if (!reservation) throw new ReservationNotFoundError();

    const { shop } = reservation.proposal;

    return {
      reservationId: Number(reservation.id),
      shopName: shop.name,
      address: shop.addressDetail ? `${shop.address} ${shop.addressDetail}` : shop.address,
      reservedAt: reservation.reservedAt,
      totalPrice: reservation.proposal.totalPrice,
      status: reservation.status,
      // TODO: [malibu] Design 모델 추가 후 연결 예정
      designName: null,
    };
  }
}
