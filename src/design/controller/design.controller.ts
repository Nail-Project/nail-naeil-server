import { Request, Response, NextFunction } from 'express';
import type { DesignService } from '../service/design.service';
import { GetDesignsRequest } from '../dto/get-designs-request';
import { GetDesignDetailRequest } from '../dto/get-design-detail-request';
import { GetWishlistRequest } from '../dto/get-wishlist-request';
import { InvalidDesignIdError, InvalidDesignRequestError } from '../error/design.error';
import { success } from '../../common/responses/api-response';

export class DesignController {
  constructor(private readonly designService: DesignService) {}

  // GET /api/v1/designs
  getDesigns = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = GetDesignsRequest.safeParse(req.query);

      if (!parsed.success) {
        throw new InvalidDesignRequestError(parsed.error.flatten());
      }

      const { cursor, category, size } = parsed.data;
      const result = await this.designService.getDesigns(cursor, category, size);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/designs/:designId
  getDesignDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = GetDesignDetailRequest.safeParse(req.params);

      if (!parsed.success) {
        throw new InvalidDesignIdError(parsed.error.flatten());
      }

      const result = await this.designService.getDesignDetail(parsed.data.designId, req.userId);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  // POST /api/v1/designs/:designId/wish
  // path param 검증은 GetDesignDetailRequest(designId 파싱)를 그대로 재사용한다 -
  // 상세 조회와 동일하게 "path의 designId가 양의 정수인지"만 확인하면 되는 동일한 규칙이다.
  createWish = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = GetDesignDetailRequest.safeParse(req.params);

      if (!parsed.success) {
        throw new InvalidDesignIdError(parsed.error.flatten());
      }

      const result = await this.designService.createWish(parsed.data.designId, req.userId);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/v1/designs/:designId/wish
  deleteWish = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = GetDesignDetailRequest.safeParse(req.params);

      if (!parsed.success) {
        throw new InvalidDesignIdError(parsed.error.flatten());
      }

      const result = await this.designService.deleteWish(parsed.data.designId, req.userId);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/designs/wishlist
  getWishlist = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = GetWishlistRequest.safeParse(req.query);

      if (!parsed.success) {
        throw new InvalidDesignRequestError(parsed.error.flatten());
      }

      const { cursor, size } = parsed.data;
      const result = await this.designService.getWishlist(req.userId, cursor, size);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };
}
