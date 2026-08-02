import { Request, Response, NextFunction } from 'express';
import type { DesignAdminService } from '../service/design-admin.service';
import { CreateDesignRequest } from '../dto/admin/create-design-request';
import { UpdateDesignRequest } from '../dto/admin/update-design-request';
import { GetDesignDetailRequest } from '../dto/get-design-detail-request';
import { InvalidDesignAdminRequestError, InvalidDesignIdError } from '../error/design.error';
import { success } from '../../common/responses/api-response';

export class DesignAdminController {
  constructor(private readonly designAdminService: DesignAdminService) {}

  // POST /admin/api/v1/designs
  createDesign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateDesignRequest.safeParse(req.body);

      if (!parsed.success) {
        throw new InvalidDesignAdminRequestError(parsed.error.flatten());
      }

      const result = await this.designAdminService.createDesign(parsed.data);
      res.status(201).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  // PATCH /admin/api/v1/designs/:designId
  updateDesign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedId = GetDesignDetailRequest.safeParse(req.params);
      if (!parsedId.success) {
        throw new InvalidDesignIdError(parsedId.error.flatten());
      }

      const parsedBody = UpdateDesignRequest.safeParse(req.body);
      if (!parsedBody.success) {
        throw new InvalidDesignAdminRequestError(parsedBody.error.flatten());
      }

      const result = await this.designAdminService.updateDesign(
        parsedId.data.designId,
        parsedBody.data,
      );
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  // DELETE /admin/api/v1/designs/:designId
  deleteDesign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedId = GetDesignDetailRequest.safeParse(req.params);
      if (!parsedId.success) {
        throw new InvalidDesignIdError(parsedId.error.flatten());
      }

      await this.designAdminService.deleteDesign(parsedId.data.designId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
