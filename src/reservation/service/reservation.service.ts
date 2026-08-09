import { Prisma } from '../../generated/prisma/client';
import type { ReservationStatus } from '../../generated/prisma/enums';
import {
  PrismaReservationRepository,
  type ReservationRepository,
} from '../repository/reservation.repository';
import { CreateReservationRequestType } from '../dto/create-reservation-request';
import { CreateReservationResponse } from '../dto/create-reservation-response';
import { GetReservationsResponse } from '../dto/get-reservations-response';
import type { ReservationCursor } from '../dto/get-reservations-request';
import { GetReservationDetailResponse } from '../dto/get-reservation-detail-response';
import type { ReservationListStatus } from '../reservation.constants';
import { encodeCursor } from '../../common/pagination/cursor';
import { ReservationFailedError } from '../../common/errors/common.error';
import {
  AlreadyReservedError,
  ProposalNotFoundError,
  ProposalTimeNotFoundError,
  ReservationAlreadyFinalizedError,
  ReservationLockConflictError,
  ReservationNotFoundError,
} from '../error/reservation.error';
import { NotificationService } from '../../notification/service/notification.service';

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

// 사전 검증과 트랜잭션 사이의 경쟁 상태로 예약 시간 slot이 사라진 경우
// (ReservationRepository.create()의 트랜잭션에 새 작업이 추가되면 이 매핑도 함께 검토한다)
const isRecordNotFoundError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';

export class ReservationService {
  // 기본값을 두어 다른 도메인(마이페이지)에서 new ReservationService()로 간단히 쓰되,
  // 테스트/라우터에서는 fake·Prisma 구현체를 명시적으로 주입할 수 있다.
  constructor(
    private readonly reservationRepository: ReservationRepository = new PrismaReservationRepository(),
    // 예약 확정/취소 시 알림을 보낸다. 알림 실패가 예약 처리 자체를 막지 않도록 격리한다.
    private readonly notificationService = new NotificationService(),
  ) {}

  // 다가오는 예약 수(CONFIRMED + 예약 시각 미도래). 마이페이지 요약에서 이 서비스를 통해 호출한다.
  async countUpcoming(userId: number): Promise<number> {
    return this.reservationRepository.countUpcomingByUser(userId, new Date());
  }

  // 예약 생성
  async createReservation(
    dto: CreateReservationRequestType,
    userId: number,
  ): Promise<CreateReservationResponse> {
    const { proposalId, timeId } = dto;

    // 존재하지 않는 견적 id인 경우 404
    const proposal = await this.reservationRepository.findProposalById(proposalId);
    if (!proposal) throw new ProposalNotFoundError();

    // [malibu][A4] 별도의 "견적 확정(ACCEPTED)" 상태 체크는 두지 않는다.
    // 위 findProposalById()의 존재 여부 체크(404)가 이미 "샵이 응답했는지"를 걸러준다 —
    // 샵이 응답(SMS)하기 전에는 EstimateResponse 자체가 생성되지 않으므로 proposalId가 없고,
    // 응답 대기중인 견적으로는 애초에 예약을 시도할 방법이 없다.
    // SUBMITTED/ACCEPTED/REJECTED 세부 상태를 추가로 구분해서 막는 별도 확정 단계는
    // 스펙/Figma 어디에도 없어 불필요하다고 판단, 2026-07-24 확정.

    // 존재하지 않거나 해당 견적 소속이 아닌 시간 id인 경우 404
    const proposalTime = await this.reservationRepository.findProposalTimeById(timeId);
    if (!proposalTime || proposalTime.proposalId !== proposalId) {
      throw new ProposalTimeNotFoundError();
    }

    // 이미 지난 시간은 예약 불가 (404 - 더 이상 유효하지 않은 시간 slot)
    if (proposalTime.proposalDatetime < new Date()) {
      throw new ProposalTimeNotFoundError();
    }

    // 동일 견적에 대한 중복 예약인 경우 409 (사전 체크 - 일반적인 경우 빠르게 차단)
    const alreadyReserved = await this.reservationRepository.existsByProposalId(proposalId);
    if (alreadyReserved) throw new AlreadyReservedError();

    try {
      const result = await this.reservationRepository.create({
        proposalId,
        timeId,
        userId,
        reservedAt: proposalTime.proposalDatetime,
      });

      // 예약 확정 알림. 실패해도 예약 결과 반환을 막지 않도록 격리한다.
      await this.safeNotify({
        userId,
        type: 'RESERVATION_CONFIRMED',
        title: '예약이 확정됐어요',
        body: `${result.proposal.shop.name} 예약이 확정됐어요.`,
        data: { reservationId: Number(result.id) },
      });

      return {
        reservationId: Number(result.id),
        shopName: result.proposal.shop.name,
        reservedAt: result.reservedAt,
        totalPrice: result.proposal.totalPrice,
        status: result.status,
      };
    } catch (error) {
      // 견적 row 락으로 감지한 동시 예약 경쟁 상태 (repository.create() 참고)
      if (error instanceof ReservationLockConflictError) throw new AlreadyReservedError();
      // DB unique 제약조건 위반 - 사전 체크와 생성 사이의 경쟁 상태로 중복 예약된 경우
      if (isUniqueConstraintError(error)) throw new AlreadyReservedError();
      // 사전 체크 이후 예약 시간 slot이 동시에 삭제/변경된 경쟁 상태
      if (isRecordNotFoundError(error)) throw new ProposalTimeNotFoundError();
      // 그 외 실패 - 원본 에러는 공통 에러 핸들러가 500 로그로 남기므로 여기서 중복 로깅하지 않는다.
      // 대신 원본 에러를 data로 실어 보내 핸들러 로그에서 원인을 확인할 수 있게 한다.
      throw new ReservationFailedError({ originalError: error });
    }
  }

  // 확정(CONFIRMED)/지난(PAST=COMPLETED+CANCELLED) 예약 목록 조회
  async getReservations(
    status: ReservationListStatus,
    userId: number,
    cursor: ReservationCursor | undefined,
    size: number,
  ): Promise<GetReservationsResponse> {
    const statuses: ReservationStatus[] =
      status === 'CONFIRMED' ? ['CONFIRMED'] : ['COMPLETED', 'CANCELLED'];

    const { reservations, hasNext } = await this.reservationRepository.findByUserIdAndStatuses(
      userId,
      statuses,
      cursor,
      size,
    );

    const last = reservations[reservations.length - 1];
    const nextCursor =
      hasNext && last
        ? encodeCursor({ reservedAt: last.reservedAt.toISOString(), id: last.id.toString() })
        : null;

    return {
      reservations: reservations.map((r) => ({
        reservationId: Number(r.id),
        proposalId: r.proposalId,
        reservedAt: r.reservedAt,
        status: r.status,
        shopName: r.proposal.shop.name,
        shopThumbnailUrl: r.proposal.shop.thumbnailImageUrl,
        totalPrice: r.proposal.totalPrice,
        nailType: r.proposal.request.nailType,
        removalType: r.proposal.request.removalType,
        designName: r.proposal.request.design?.title ?? null,
        designTags: r.proposal.request.design?.tags.map((t) => t.tag.name) ?? [],
      })),
      pageInfo: { nextCursor, hasNext },
    };
  }

  // 예약 상세 조회
  async getReservationDetail(
    reservationId: bigint,
    userId: number,
  ): Promise<GetReservationDetailResponse> {
    const reservation = await this.reservationRepository.findByIdAndUserId(reservationId, userId);
    if (!reservation) throw new ReservationNotFoundError();

    const { shop } = reservation.proposal;

    return {
      reservationId: Number(reservation.id),
      shopName: shop.name,
      shopPhoneNumber: shop.phoneNumber,
      address: shop.addressDetail ? `${shop.address} ${shop.addressDetail}` : shop.address,
      addressDetail: shop.addressDetail,
      shopRating: shop.rating.toNumber(),
      shopReviewCount: shop.reviewCount,
      latitude: shop.latitude.toNumber(),
      longitude: shop.longitude.toNumber(),
      shopThumbnailUrl: shop.thumbnailImageUrl,
      shopBusinessHours: shop.businessHours,
      shopClosedDays: shop.closedDays,
      // TODO: [malibu] 위도/경도 쿼리 파라미터 설계 후 실제 거리 계산 연결 예정
      distanceMeters: null,
      reservedAt: reservation.reservedAt,
      basePrice: reservation.proposal.basePrice,
      removalPrice: reservation.proposal.removalPrice,
      extraPrice: reservation.proposal.extraPrice,
      totalPrice: reservation.proposal.totalPrice,
      shopComment: reservation.proposal.memo,
      nailType: reservation.proposal.request.nailType,
      removalType: reservation.proposal.request.removalType,
      images: reservation.proposal.request.images.map((image) => image.imageUrl),
      status: reservation.status,
      designName: reservation.proposal.request.design?.title ?? null,
    };
  }

  // 예약 취소
  async cancelReservation(reservationId: bigint, userId: number, reason: string): Promise<void> {
    // 존재하지 않거나 본인 소유가 아닌 예약인 경우 404 (findStatusByIdAndUserId의 where절에서
    // userId를 함께 걸어 소유권을 검증한다 - IDOR 방지)
    const reservation = await this.reservationRepository.findStatusByIdAndUserId(
      reservationId,
      userId,
    );
    if (!reservation) throw new ReservationNotFoundError();

    // 이미 취소됐거나 완료된 예약은 다시 취소할 수 없음 (사전 체크 - 일반적인 경우 빠르게 차단)
    if (reservation.status !== 'CONFIRMED') throw new ReservationAlreadyFinalizedError();

    let cancelled;
    try {
      cancelled = await this.reservationRepository.cancel(reservationId, userId, reason);
    } catch (error) {
      throw new ReservationFailedError({ originalError: error });
    }

    // 사전 체크와 조건부 업데이트(cancel()의 updateMany) 사이의 경쟁 상태로
    // 동시에 들어온 취소 요청이 먼저 반영된 경우 - count가 0이라 null이 돌아온다.
    if (!cancelled) throw new ReservationAlreadyFinalizedError();

    // 예약 취소 알림. 실패해도 취소 처리를 막지 않도록 격리한다.
    await this.safeNotify({
      userId,
      type: 'RESERVATION_CANCELLED',
      title: '예약이 취소됐어요',
      body: '예약이 취소됐어요.',
      data: { reservationId: Number(reservationId) },
    });
  }

  // 알림 발송을 격리해 호출한다. 알림 실패가 예약 처리 결과에 영향을 주지 않도록 로깅만 하고 삼킨다.
  private async safeNotify(params: {
    userId: number;
    type: 'RESERVATION_CONFIRMED' | 'RESERVATION_CANCELLED';
    title: string;
    body: string;
    data?: Prisma.InputJsonValue;
  }): Promise<void> {
    try {
      await this.notificationService.notify(params);
    } catch (error) {
      console.error('[ReservationService] 알림 생성 실패', {
        type: params.type,
        errorType: error instanceof Error ? error.name : typeof error,
      });
    }
  }
}
