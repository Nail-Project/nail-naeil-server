import type { DesignRepository } from '../repository/design.repository';
import type { GetDesignsResponse } from '../dto/get-designs-response';
import type { GetDesignDetailResponse } from '../dto/get-design-detail-response';
import { DesignNotFoundError } from '../error/design.error';

export class DesignService {
  constructor(private readonly designRepository: DesignRepository) {}

  // 디자인 피드 조회
  async getDesigns(page: number, size: number): Promise<GetDesignsResponse> {
    const { designs, totalElements } = await this.designRepository.findFeed(page, size);

    return {
      designs: designs.map((design) => ({
        designId: design.id,
        title: design.title,
        imageUrl: design.imageUrl,
        tag: design.tag,
      })),
      pageInfo: {
        currentPage: page,
        pageSize: size,
        totalElements,
        hasNext: page * size < totalElements,
      },
    };
  }

  // 디자인 상세 조회 - 조회수 반영, 요청자의 찜 여부 포함
  async getDesignDetail(designId: number, userId: number): Promise<GetDesignDetailResponse> {
    const design = await this.designRepository.findDetailById(designId);
    if (!design) throw new DesignNotFoundError();

    await this.designRepository.incrementViewCount(designId);
    const isBookmarked = await this.designRepository.isWishedByUser(designId, userId);

    return {
      designId: design.id,
      title: design.title,
      images: design.images,
      tag: design.tag,
      // 방금 반영한 조회수를 즉시 응답에 반영 (재조회 없이 +1)
      viewCount: design.viewCount + 1,
      wishCount: design.wishCount,
      durationMinutes: design.durationMinutes,
      difficulty: design.difficulty,
      recommendedShape: design.recommendedShape,
      description: design.description,
      isBookmarked,
    };
  }
}
