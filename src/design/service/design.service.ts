import { Prisma } from '../../generated/prisma/client';
import type { DesignRepository } from '../repository/design.repository';
import type { GetDesignsResponse } from '../dto/get-designs-response';
import type { DesignCursor } from '../dto/get-designs-request';
import type { GetDesignDetailResponse } from '../dto/get-design-detail-response';
import type { WishCursor } from '../dto/get-wishlist-request';
import type { GetWishlistResponse } from '../dto/get-wishlist-response';
import type { CreateDesignWishResponse } from '../dto/create-design-wish-response';
import type { DeleteDesignWishResponse } from '../dto/delete-design-wish-response';
import { DesignNotFoundError } from '../error/design.error';
import { encodeCursor } from '../../common/pagination/cursor';

// 존재 확인과 조회수 증가 사이의 경쟁 상태로 디자인이 삭제된 경우
// (reservation 도메인의 isRecordNotFoundError와 동일 패턴)
const isRecordNotFoundError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';

// 존재 확인과 찜 생성 사이의 경쟁 상태로 디자인이 삭제된 경우 - WishDesign.designId는
// FK라서 부모 행이 없으면 P2025가 아니라 P2003(외래 키 제약 위반)로 온다.
const isForeignKeyConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';

export class DesignService {
  constructor(private readonly designRepository: DesignRepository) {}

  // 디자인 피드 조회
  async getDesigns(
    cursor: DesignCursor | undefined,
    category: string | undefined,
    size: number,
  ): Promise<GetDesignsResponse> {
    const { designs, hasNext } = await this.designRepository.findFeed(cursor, category, size);

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

  // 디자인 찜 생성 - 멱등 처리(추천안): 하트 토글 UI 특성상 프론트가 "찜 안 한 상태"를
  // 정확히 알고 눌렀다고 가정하기 어렵다. 이미 찜한 디자인을 다시 찜해도 409로 막지 않고
  // 200으로 성공 처리해 같은 결과(찜됨)로 수렴시키는 쪽이 UX상 더 안전하다고 판단했다.
  async createWish(designId: number, userId: number): Promise<CreateDesignWishResponse> {
    const exists = await this.designRepository.existsById(designId);
    if (!exists) throw new DesignNotFoundError();

    try {
      const { wishCount } = await this.designRepository.createWish(designId, userId);
      return { isBookmarked: true, wishCount };
    } catch (error) {
      // 존재 확인 이후 삭제된 경쟁 상태
      if (isRecordNotFoundError(error) || isForeignKeyConstraintError(error)) {
        throw new DesignNotFoundError();
      }
      throw error;
    }
  }

  // 디자인 찜 삭제 - 찜하지 않은 상태에서 호출해도 에러 없이 멱등하게 "찜 안 함" 상태로
  // 수렴한다(repository.deleteWish가 deleteMany라 대상이 없어도 에러를 던지지 않는다).
  async deleteWish(designId: number, userId: number): Promise<DeleteDesignWishResponse> {
    const exists = await this.designRepository.existsById(designId);
    if (!exists) throw new DesignNotFoundError();

    const { wishCount } = await this.designRepository.deleteWish(designId, userId);
    return { isBookmarked: false, wishCount };
  }

  // 내가 찜한 디자인 목록 조회 - "찜한 시점" 기준 커서 페이지네이션
  async getWishlist(
    userId: number,
    cursor: WishCursor | undefined,
    size: number,
  ): Promise<GetWishlistResponse> {
    const { items, hasNext } = await this.designRepository.findWishlistByUserId(
      userId,
      cursor,
      size,
    );

    const last = items[items.length - 1];
    const nextCursor =
      hasNext && last
        ? encodeCursor({ createdAt: last.wishedAt.toISOString(), id: last.wishId })
        : null;

    return {
      designs: items.map((item) => ({
        designId: item.id,
        title: item.title,
        imageUrl: item.imageUrl,
        tags: item.tags,
        viewCount: item.viewCount,
        wishCount: item.wishCount,
      })),
      pageInfo: { nextCursor, hasNext },
    };
  }
}
