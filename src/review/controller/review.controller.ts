import { Request, Response, NextFunction } from 'express';
import type { ReviewService } from '../service/review.service';
import { CreateReviewPath } from '../dto/request/create-review-path';
import { CreateReviewRequest } from '../dto/request/create-review-request';
import { InvalidReviewReservationIdError, ReviewValidationError } from '../error/review.error';
import { success } from '../../common/responses/api-response';

export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // POST /api/v1/reserve/:reservationId/review
  createReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedParams = CreateReviewPath.safeParse(req.params);
      if (!parsedParams.success) {
        throw new InvalidReviewReservationIdError(parsedParams.error.flatten());
      }

      const parsedBody = CreateReviewRequest.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ReviewValidationError(parsedBody.error.flatten());
      }

      const result = await this.reviewService.createReview(
        BigInt(parsedParams.data.reservationId),
        req.userId,
        parsedBody.data,
      );
      res.status(201).json(success(result));
    } catch (error) {
      next(error);
    }
  };
}
