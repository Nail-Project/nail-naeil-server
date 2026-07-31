import { Request, Response, NextFunction } from 'express';
import type { DesignService } from '../service/design.service';
import { GetDesignsRequest } from '../dto/get-designs-request';
import { GetDesignDetailRequest } from '../dto/get-design-detail-request';
import { InvalidDesignIdError, InvalidDesignRequestError } from '../error/design.error';
import { success } from '../../common/responses/api-response';

// TODO: [malibu] 로그인 구현 후 토큰에서 userId 추출하는 로직으로 교체
const TEMP_USER_ID = 1;

export class DesignController {
  constructor(private readonly designService: DesignService) {}

  // GET /api/v1/designs
  getDesigns = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = GetDesignsRequest.safeParse(req.query);

      if (!parsed.success) {
        throw new InvalidDesignRequestError(parsed.error.flatten());
      }

      const { page, size } = parsed.data;
      const result = await this.designService.getDesigns(page, size);
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

      const result = await this.designService.getDesignDetail(
        parsed.data.designId,
        TEMP_USER_ID,
      );
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };
}
