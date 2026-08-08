import type { NextFunction, Request, Response } from 'express';
import { success } from '../../common/responses/api-response';
import { GetShopDetailRequestSchema, ShopIdSchema } from '../dto/request/get-shop-detail-request';
import { GetShopListRequestSchema } from '../dto/request/get-shop-list-request';
import { SearchShopRequestSchema } from '../dto/request/search-shop-request';
import { GetShopReviewsRequestSchema } from '../dto/request/get-shop-reviews-request';
import { InvalidShopQueryRequestError } from '../errors/shop.error';
import type { ShopQueryService } from '../service/shop-query.service';

export class ShopQueryController {
  constructor(private readonly service: ShopQueryService) {}

  getList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = GetShopListRequestSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new InvalidShopQueryRequestError(parsed.error.flatten());
      }

      res.status(200).json(success(await this.service.getList(parsed.data, req.userId)));
    } catch (error) {
      next(error);
    }
  };

  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = SearchShopRequestSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new InvalidShopQueryRequestError(parsed.error.flatten());
      }

      res.status(200).json(success(await this.service.search(parsed.data, req.userId)));
    } catch (error) {
      next(error);
    }
  };

  getDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = GetShopDetailRequestSchema.safeParse({ ...req.query, ...req.params });
      if (!parsed.success) {
        throw new InvalidShopQueryRequestError(parsed.error.flatten());
      }

      res
        .status(200)
        .json(
          success(
            await this.service.getDetail(
              parsed.data.shopId,
              req.userId,
              parsed.data.latitude,
              parsed.data.longitude,
            ),
          ),
        );
    } catch (error) {
      next(error);
    }
  };

  createWish = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = ShopIdSchema.safeParse(req.params.shopId);
      if (!parsed.success) throw new InvalidShopQueryRequestError(parsed.error.flatten());
      res.status(200).json(success(await this.service.createWish(parsed.data, req.userId)));
    } catch (error) {
      next(error);
    }
  };

  deleteWish = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = ShopIdSchema.safeParse(req.params.shopId);
      if (!parsed.success) throw new InvalidShopQueryRequestError(parsed.error.flatten());
      res.status(200).json(success(await this.service.deleteWish(parsed.data, req.userId)));
    } catch (error) {
      next(error);
    }
  };

  getWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = GetShopListRequestSchema.safeParse(req.query);
      if (!parsed.success) throw new InvalidShopQueryRequestError(parsed.error.flatten());
      res
        .status(200)
        .json(
          success(
            await this.service.getWishlist(
              req.userId,
              parsed.data.limit,
              parsed.data.cursor,
              parsed.data.latitude,
              parsed.data.longitude,
            ),
          ),
        );
    } catch (error) {
      next(error);
    }
  };

  getReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = GetShopReviewsRequestSchema.safeParse({ ...req.query, ...req.params });
      if (!parsed.success) throw new InvalidShopQueryRequestError(parsed.error.flatten());
      res
        .status(200)
        .json(
          success(
            await this.service.getReviews(
              parsed.data.shopId,
              parsed.data.limit,
              parsed.data.cursor,
            ),
          ),
        );
    } catch (error) {
      next(error);
    }
  };
}
