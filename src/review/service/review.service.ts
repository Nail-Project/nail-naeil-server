import { Prisma } from '../../generated/prisma/client';
import type { ReviewRepository } from '../repository/review.repository';
import type { ShopReviewCursor } from '../dto/request/get-shop-reviews-request';
import type { CreateReviewRequestType } from '../dto/request/create-review-request';
import type { UpdateReviewRequestType } from '../dto/request/update-review-request';
import type { CreateReviewResponse } from '../dto/response/create-review-response';
import type { UpdateReviewResponse } from '../dto/response/update-review-response';
import type { DeleteReviewResponse } from '../dto/response/delete-review-response';
import type { GetShopReviewsResponse } from '../dto/response/get-shop-reviews-response';
import {
  ReviewReservationNotFoundError,
  ReviewNotAllowedError,
  ReviewAlreadyExistsError,
  ReviewNotFoundError,
  ReviewShopNotFoundError,
} from '../error/review.error';
import { ReviewFailedError } from '../../common/errors/common.error';
import { encodeCursor } from '../../common/pagination/cursor';

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

export class ReviewService {
  constructor(private readonly reviewRepository: ReviewRepository) {}

  // 리뷰 작성
  async createReview(
    reservationId: bigint,
    userId: number,
    dto: Omit<CreateReviewRequestType, 'reservationId'>,
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

  // 리뷰 수정 (본인 작성 리뷰만)
  async updateReview(
    reviewId: number,
    userId: number,
    dto: UpdateReviewRequestType,
  ): Promise<UpdateReviewResponse> {
    // 존재하지 않거나 본인 작성이 아닌 리뷰인 경우 404 (findByIdForOwner의 where절에서
    // userId를 함께 걸어 소유권을 검증한다 - IDOR 방지)
    const review = await this.reviewRepository.findByIdForOwner(reviewId, userId);
    if (!review) throw new ReviewNotFoundError();

    try {
      const updated = await this.reviewRepository.update(reviewId, review.shopId, dto);

      return {
        reviewId: updated.id,
        reservationId: Number(updated.reservationId),
        shopId: updated.shopId,
        rating: updated.rating,
        content: updated.content,
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      throw new ReviewFailedError({ originalError: error });
    }
  }

  // 리뷰 삭제 (본인 작성 리뷰만)
  async deleteReview(reviewId: number, userId: number): Promise<DeleteReviewResponse> {
    const review = await this.reviewRepository.findByIdForOwner(reviewId, userId);
    if (!review) throw new ReviewNotFoundError();

    try {
      await this.reviewRepository.delete(reviewId, review.shopId);
    } catch (error) {
      throw new ReviewFailedError({ originalError: error });
    }

    return { reviewId };
  }

  // 샵 리뷰 목록 조회 - 작성일 최신순 커서 페이지네이션
  async getShopReviews(
    shopId: number,
    cursor: ShopReviewCursor | undefined,
    size: number,
  ): Promise<GetShopReviewsResponse> {
    const shopExists = await this.reviewRepository.shopExists(shopId);
    if (!shopExists) throw new ReviewShopNotFoundError();

    const { items, hasNext } = await this.reviewRepository.findByShopId(shopId, cursor, size);

    const last = items[items.length - 1];
    const nextCursor =
      hasNext && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null;

    return {
      reviews: items.map((item) => ({
        reviewId: item.id,
        nickname: item.user.nickname,
        rating: item.rating,
        content: item.content,
        createdAt: item.createdAt,
      })),
      pageInfo: { nextCursor, hasNext },
    };
  }
}
