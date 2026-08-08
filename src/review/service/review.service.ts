import { Prisma } from '../../generated/prisma/client';
import type { ReviewRepository } from '../repository/review.repository';
import type { CreateReviewRequestType } from '../dto/request/create-review-request';
import type { CreateReviewResponse } from '../dto/response/create-review-response';
import {
  ReviewReservationNotFoundError,
  ReviewNotAllowedError,
  ReviewAlreadyExistsError,
} from '../error/review.error';
import { ReviewFailedError } from '../../common/errors/common.error';

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

export class ReviewService {
  constructor(private readonly reviewRepository: ReviewRepository) {}

  // 리뷰 작성
  async createReview(
    reservationId: bigint,
    userId: number,
    dto: CreateReviewRequestType,
  ): Promise<CreateReviewResponse> {
    // 존재하지 않거나 본인 소유가 아닌 예약인 경우 404 (findReservationForReview의 where절에서
    // userId를 함께 걸어 소유권을 검증한다 - IDOR 방지)
    const reservation = await this.reviewRepository.findReservationForReview(reservationId, userId);
    if (!reservation) throw new ReviewReservationNotFoundError();

    // 시술이 완료된 예약만 리뷰 작성 가능
    if (reservation.status !== 'COMPLETED') throw new ReviewNotAllowedError();

    // 이미 리뷰를 작성한 예약인 경우 409 (사전 체크 - 일반적인 경우 빠르게 차단)
    const alreadyReviewed = await this.reviewRepository.existsByReservationId(reservationId);
    if (alreadyReviewed) throw new ReviewAlreadyExistsError();

    try {
      const review = await this.reviewRepository.create({
        reservationId,
        shopId: reservation.proposal.shopId,
        userId,
        rating: dto.rating,
        content: dto.content,
      });

      return {
        reviewId: review.id,
        reservationId: Number(review.reservationId),
        shopId: review.shopId,
        rating: review.rating,
        content: review.content,
        createdAt: review.createdAt,
      };
    } catch (error) {
      // 사전 체크 통과 후 동시 작성 경쟁 상태로 unique 제약(P2002) 위반
      if (isUniqueConstraintError(error)) throw new ReviewAlreadyExistsError();
      throw new ReviewFailedError({ originalError: error });
    }
  }
}
