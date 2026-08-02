import { Request, Response, NextFunction } from 'express';
import type { DesignAdminService } from '../service/design-admin.service';
import { CreateDesignRequest } from '../dto/admin/create-design-request';
import { UpdateDesignRequest } from '../dto/admin/update-design-request';
import { GetDesignDetailRequest } from '../dto/get-design-detail-request';
import { InvalidDesignAdminRequestError, InvalidDesignIdError } from '../error/design.error';
import { success } from '../../common/responses/api-response';

export class DesignAdminController {
  constructor(private readonly designAdminService: DesignAdminService) {}

  // updateDesign/deleteDesign이 공통으로 쓰는 designId path variable 파싱
  private parseDesignId(params: unknown): number {
    const parsed = GetDesignDetailRequest.safeParse(params);

    if (!parsed.success) {
      throw new InvalidDesignIdError(parsed.error.flatten());
    }

    return parsed.data.designId;
  }

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
      const designId = this.parseDesignId(req.params);

      const parsedBody = UpdateDesignRequest.safeParse(req.body);
      if (!parsedBody.success) {
        throw new InvalidDesignAdminRequestError(parsedBody.error.flatten());
      }

      const result = await this.designAdminService.updateDesign(designId, parsedBody.data);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  // DELETE /admin/api/v1/designs/:designId
  deleteDesign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const designId = this.parseDesignId(req.params);

      await this.designAdminService.deleteDesign(designId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
