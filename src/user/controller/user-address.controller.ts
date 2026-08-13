import type { NextFunction, Request, Response } from 'express';
import { success } from '../../common/responses/api-response';
import {
  CreateUserAddressRequestSchema,
  UpdateUserAddressRequestSchema,
  UserAddressPathSchema,
} from '../dto/user-address-request';
import { UserAddressValidationError } from '../error/user-address.error';
import { UserAddressService } from '../service/user-address.service';

export class UserAddressController {
  constructor(private readonly service = new UserAddressService()) {}

  getAddresses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json(success(await this.service.getAddresses(req.userId)));
    } catch (error) {
      next(error);
    }
  };

  createAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateUserAddressRequestSchema.safeParse(req.body);
      if (!parsed.success) throw new UserAddressValidationError(parsed.error.flatten());
      res.status(201).json(success(await this.service.createAddress(req.userId, parsed.data)));
    } catch (error) {
      next(error);
    }
  };

  updateAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const path = UserAddressPathSchema.safeParse(req.params);
      const body = UpdateUserAddressRequestSchema.safeParse(req.body);
      if (!path.success || !body.success) {
        throw new UserAddressValidationError({
          path: path.error?.flatten(),
          body: body.error?.flatten(),
        });
      }
      res
        .status(200)
        .json(
          success(await this.service.updateAddress(path.data.addressId, req.userId, body.data)),
        );
    } catch (error) {
      next(error);
    }
  };

  deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = UserAddressPathSchema.safeParse(req.params);
      if (!parsed.success) throw new UserAddressValidationError(parsed.error.flatten());
      res
        .status(200)
        .json(success(await this.service.deleteAddress(parsed.data.addressId, req.userId)));
    } catch (error) {
      next(error);
    }
  };
}
