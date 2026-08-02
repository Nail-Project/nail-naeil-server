import { Prisma } from '../../generated/prisma/client';
import type { DesignRepository } from '../repository/design.repository';
import type { GetDesignsResponse } from '../dto/get-designs-response';
import type { DesignCursor } from '../dto/get-designs-request';
import type { GetDesignDetailResponse } from '../dto/get-design-detail-response';
import { DesignNotFoundError } from '../error/design.error';
import { encodeCursor } from '../../common/pagination/cursor';

// 존재 확인과 조회수 증가 사이의 경쟁 상태로 디자인이 삭제된 경우
// (reservation 도메인의 isRecordNotFoundError와 동일 패턴)
const isRecordNotFoundError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';

export class DesignService {
  constructor(private readonly designRepository: DesignRepository) {}

  // 디자인 피드 조회
  async getDesigns(cursor: DesignCursor | undefined, size: number): Promise<GetDesignsResponse> {
    const { designs, hasNext } = await this.designRepository.findFeed(cursor, size);

    const last = designs[designs.length - 1];
    const nextCursor =
      hasNext && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null;

    return {
      designs: designs.map((design) => ({
        designId: design.id,
        title: design.title,
        imageUrl: design.imageUrl,
        tags: design.tags,
        viewCount: design.viewCount,
        wishCount: design.wishCount,
      })),
      pageInfo: { nextCursor, hasNext },
    };
  }

  // 디자인 상세 조회 - 조회수 반영, 요청자의 찜 여부 포함
  async getDesignDetail(designId: number, userId: number): Promise<GetDesignDetailResponse> {
    const design = await this.designRepository.findDetailById(designId);
    if (!design) throw new DesignNotFoundError();

    let viewCount: number;
    let isBookmarked: boolean;
    try {
      [viewCount, isBookmarked] = await Promise.all([
        this.designRepository.incrementViewCount(designId),
        this.designRepository.isWishedByUser(designId, userId),
      ]);
    } catch (error) {
      // 존재 확인 이후 삭제된 경쟁 상태
      if (isRecordNotFoundError(error)) throw new DesignNotFoundError();
      throw error;
    }

    return {
      designId: design.id,
      title: design.title,
      images: design.images,
      tags: design.tags,
      viewCount,
      wishCount: design.wishCount,
      durationMinutes: design.durationMinutes,
      difficulty: design.difficulty,
      recommendedShape: design.recommendedShape,
      description: design.description,
      isBookmarked,
    };
  }
}
