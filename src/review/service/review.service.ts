import { Prisma } from '../../generated/prisma/client';
import type { ReviewRepository } from '../repository/review.repository';
import type { CreateReviewRequestType } from '../dto/request/create-review-request';
import type { UpdateReviewRequestType } from '../dto/request/update-review-request';
import type { CreateReviewResponse } from '../dto/response/create-review-response';
import type { UpdateReviewResponse } from '../dto/response/update-review-response';
import type { DeleteReviewResponse } from '../dto/response/delete-review-response';
import {
  ReviewNotEligibleError,
  ReviewAlreadyExistsError,
  ReviewNotFoundError,
} from '../error/review.error';
import { ReviewFailedError } from '../../common/errors/common.error';

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

// findByIdForOwner로 존재를 확인한 이후, update/delete 실행 사이의 경쟁 상태로
// 리뷰가 먼저 삭제된 경우 (design/reservation 도메인의 isRecordNotFoundError와 동일 패턴)
const isRecordNotFoundError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';

export class ReviewService {
  constructor(private readonly reviewRepository: ReviewRepository) {}

  // 리뷰 작성 - 해당 샵에서 시술이 완료된 본인 예약이 있어야 하고, 샵 1곳당 리뷰는 1개까지만 가능
  async createReview(
    shopId: number,
    userId: number,
    dto: Omit<CreateReviewRequestType, 'shopId'>,
  ): Promise<CreateReviewResponse> {
    const reservation = await this.reviewRepository.findCompletedReservationForShop(shopId, userId);
    if (!reservation) throw new ReviewNotEligibleError();

    // 이미 리뷰를 작성한 샵인 경우 409 (사전 체크 - 일반적인 경우 빠르게 차단)
    const alreadyReviewed = await this.reviewRepository.existsByShopAndUser(shopId, userId);
    if (alreadyReviewed) throw new ReviewAlreadyExistsError();

    try {
      const review = await this.reviewRepository.create({
        shopId,
        userId,
        rating: dto.rating,
        content: dto.content,
      });

      return {
        reviewId: review.id,
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
        shopId: updated.shopId,
        rating: updated.rating,
        content: updated.content,
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      if (isRecordNotFoundError(error)) throw new ReviewNotFoundError();
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
      if (isRecordNotFoundError(error)) throw new ReviewNotFoundError();
      throw new ReviewFailedError({ originalError: error });
    }

    return { reviewId };
  }
}
