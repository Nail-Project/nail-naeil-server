import { Request, Response, NextFunction } from 'express';
import type { ReviewService } from '../service/review.service';
import { CreateReviewRequest } from '../dto/request/create-review-request';
import { UpdateReviewRequest } from '../dto/request/update-review-request';
import { ReviewIdPath } from '../dto/request/review-id-path';
import { GetShopReviewsPath, GetShopReviewsRequest } from '../dto/request/get-shop-reviews-request';
import { InvalidReviewRequestError, ReviewValidationError } from '../error/review.error';
import { success } from '../../common/responses/api-response';

export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // POST /api/v1/reviews
  createReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedBody = CreateReviewRequest.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ReviewValidationError(parsedBody.error.flatten());
      }

      const { reservationId, ...dto } = parsedBody.data;
      const result = await this.reviewService.createReview(BigInt(reservationId), req.userId, dto);
      res.status(201).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/v1/reviews/:reviewId
  updateReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedPath = ReviewIdPath.safeParse(req.params);
      if (!parsedPath.success) {
        throw new InvalidReviewRequestError(parsedPath.error.flatten());
      }

      const parsedBody = UpdateReviewRequest.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ReviewValidationError(parsedBody.error.flatten());
      }

      const result = await this.reviewService.updateReview(
        parsedPath.data.reviewId,
        req.userId,
        parsedBody.data,
      );
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/v1/reviews/:reviewId
  deleteReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedPath = ReviewIdPath.safeParse(req.params);
      if (!parsedPath.success) {
        throw new InvalidReviewRequestError(parsedPath.error.flatten());
      }

      const result = await this.reviewService.deleteReview(parsedPath.data.reviewId, req.userId);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/shops/:shopId/reviews
  getShopReviews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedPath = GetShopReviewsPath.safeParse(req.params);
      if (!parsedPath.success) {
        throw new InvalidReviewRequestError(parsedPath.error.flatten());
      }

      const parsedQuery = GetShopReviewsRequest.safeParse(req.query);
      if (!parsedQuery.success) {
        throw new InvalidReviewRequestError(parsedQuery.error.flatten());
      }

      const result = await this.reviewService.getShopReviews(
        parsedPath.data.shopId,
        parsedQuery.data.cursor,
        parsedQuery.data.size,
      );
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };
}
