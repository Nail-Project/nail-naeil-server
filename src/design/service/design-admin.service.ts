import { Prisma } from '../../generated/prisma/client';
import type { DesignAdminRecord, DesignRepository } from '../repository/design.repository';
import type { CreateDesignRequestType } from '../dto/admin/create-design-request';
import type { UpdateDesignRequestType } from '../dto/admin/update-design-request';
import type { DesignAdminResponse } from '../dto/admin/design-admin-response';
import { DesignNotFoundError } from '../error/design.error';

// 수정/삭제 대상이 존재하지 않는 경쟁 상태 (design 읽기 서비스의 isRecordNotFoundError와 동일 패턴)
const isRecordNotFoundError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';

const toResponse = (design: DesignAdminRecord): DesignAdminResponse => ({
  designId: design.id,
  title: design.title,
  imageUrl: design.imageUrl,
  images: design.images,
  tags: design.tags,
  durationMinutes: design.durationMinutes,
  difficulty: design.difficulty,
  recommendedShape: design.recommendedShape,
  description: design.description,
});

export class DesignAdminService {
  constructor(private readonly designRepository: DesignRepository) {}

  async createDesign(dto: CreateDesignRequestType): Promise<DesignAdminResponse> {
    const design = await this.designRepository.create(dto);

    return toResponse(design);
  }

  async updateDesign(designId: number, dto: UpdateDesignRequestType): Promise<DesignAdminResponse> {
    try {
      const design = await this.designRepository.update(designId, dto);

      return toResponse(design);
    } catch (error) {
      if (isRecordNotFoundError(error)) throw new DesignNotFoundError();
      throw error;
    }
  }

  async deleteDesign(designId: number): Promise<void> {
    try {
      await this.designRepository.delete(designId);
    } catch (error) {
      if (isRecordNotFoundError(error)) throw new DesignNotFoundError();
      throw error;
    }
  }
}
