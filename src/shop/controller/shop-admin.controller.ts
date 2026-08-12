import type { NextFunction, Request, Response } from 'express';
import { success } from '../../common/responses/api-response';
import {
  CreateShopAdminRequest,
  GetShopsAdminQuery,
  ShopAdminIdPath,
  UpdateShopAdminRequest,
} from '../dto/request/shop-admin-request';
import { InvalidShopAdminRequestError, InvalidShopIdError } from '../errors/shop.error';
import type { ShopAdminService } from '../service/shop-admin.service';

export class ShopAdminController {
  constructor(private readonly service: ShopAdminService) {}

  private parseShopId(params: unknown): number {
    const parsed = ShopAdminIdPath.safeParse(params);
    if (!parsed.success) throw new InvalidShopIdError(parsed.error.flatten());
    return parsed.data.shopId;
  }

  getShops = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = GetShopsAdminQuery.safeParse(req.query);
      if (!parsed.success) throw new InvalidShopAdminRequestError(parsed.error.flatten());
      res.status(200).json(success(await this.service.getShops(parsed.data)));
    } catch (error) {
      next(error);
    }
  };

  getShop = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json(success(await this.service.getShop(this.parseShopId(req.params))));
    } catch (error) {
      next(error);
    }
  };

  createShop = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateShopAdminRequest.safeParse(req.body);
      if (!parsed.success) throw new InvalidShopAdminRequestError(parsed.error.flatten());
      res.status(201).json(success(await this.service.createShop(parsed.data)));
    } catch (error) {
      next(error);
    }
  };

  updateShop = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const shopId = this.parseShopId(req.params);
      const parsed = UpdateShopAdminRequest.safeParse(req.body);
      if (!parsed.success) throw new InvalidShopAdminRequestError(parsed.error.flatten());
      res.status(200).json(success(await this.service.updateShop(shopId, parsed.data)));
    } catch (error) {
      next(error);
    }
  };

  deactivateShop = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res
        .status(200)
        .json(success(await this.service.deactivateShop(this.parseShopId(req.params))));
    } catch (error) {
      next(error);
    }
  };
}
