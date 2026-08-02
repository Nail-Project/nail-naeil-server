import { Prisma } from '../../generated/prisma/client';
import { getPrisma } from '../../infra/prisma';
import type { DesignCursor } from '../dto/get-designs-request';
import type { WishCursor } from '../dto/get-wishlist-request';

export interface DesignSummaryRecord {
  id: number;
  title: string;
  imageUrl: string;
  tags: string[];
  viewCount: number;
  wishCount: number;
  // 커서 생성에만 쓰는 내부 필드 - 응답 DTO 매핑 시엔 사용하지 않는다.
  createdAt: Date;
}

export interface DesignDetailRecord {
  id: number;
  title: string;
  tags: string[];
  viewCount: number;
  durationMinutes: number;
  difficulty: string;
  recommendedShape: string;
  description: string;
  images: string[];
  wishCount: number;
}

export interface WishlistItemRecord {
  id: number;
  title: string;
  imageUrl: string;
  tags: string[];
  viewCount: number;
  wishCount: number;
  // 커서 생성에만 쓰는 내부 필드 - 응답 DTO 매핑 시엔 사용하지 않는다.
  // 디자인이 아니라 WishDesign(찜 기록) 행 기준이다("찜한 시점" 정렬).
  wishId: number;
  wishedAt: Date;
}

export interface DesignAdminRecord {
  id: number;
  title: string;
  imageUrl: string;
  images: string[];
  tags: string[];
  durationMinutes: number;
  difficulty: string;
  recommendedShape: string;
  description: string;
}

export interface CreateDesignData {
  title: string;
  imageUrl: string;
  durationMinutes: number;
  difficulty: string;
  recommendedShape: string;
  description: string;
  images: string[];
  tags: string[];
}

export type UpdateDesignData = Partial<CreateDesignData>;

export interface DesignRepository {
  findFeed(
    cursor: DesignCursor | undefined,
    category: string | undefined,
    size: number,
  ): Promise<{ designs: DesignSummaryRecord[]; hasNext: boolean }>;
  findDetailById(designId: number): Promise<DesignDetailRecord | null>;
  incrementViewCount(designId: number): Promise<number>;
  isWishedByUser(designId: number, userId: number): Promise<boolean>;
  existsById(designId: number): Promise<boolean>;
  createWish(designId: number, userId: number): Promise<{ wishCount: number }>;
  deleteWish(designId: number, userId: number): Promise<{ wishCount: number }>;
  findWishlistByUserId(
    userId: number,
    cursor: WishCursor | undefined,
    size: number,
  ): Promise<{ items: WishlistItemRecord[]; hasNext: boolean }>;
  create(data: CreateDesignData): Promise<DesignAdminRecord>;
  update(designId: number, data: UpdateDesignData): Promise<DesignAdminRecord>;
  delete(designId: number): Promise<void>;
}

// 관리자 생성/수정 응답에서 공통으로 쓰는 select+매핑 - 목록/상세 조회용 select와는
// 필요한 필드가 달라(찜/조회수 없음, imageUrl 원본 필요) 별도로 둔다.
const designAdminSelect = {
  id: true,
  title: true,
  imageUrl: true,
  durationMinutes: true,
  difficulty: true,
  recommendedShape: true,
  description: true,
  images: { select: { imageUrl: true }, orderBy: { id: 'asc' } },
  tags: { select: { tag: { select: { name: true } } }, orderBy: { tagId: 'asc' } },
} as const;

type DesignAdminRow = Prisma.DesignGetPayload<{ select: typeof designAdminSelect }>;

const mapDesignAdminRecord = (design: DesignAdminRow): DesignAdminRecord => ({
  id: design.id,
  title: design.title,
  imageUrl: design.imageUrl,
  images: design.images.map((image) => image.imageUrl),
  tags: design.tags.map((t) => t.tag.name),
  durationMinutes: design.durationMinutes,
  difficulty: design.difficulty,
  recommendedShape: design.recommendedShape,
  description: design.description,
});

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

// 태그를 이름으로 upsert해서 id 목록으로 변환한다.
// AI 자동 태깅/관리자 수동 입력 둘 다 "이름"만 알고 있는 상황을 가정한 설계 - 이미 있는
// 이름이면 재사용하고, 처음 보는 이름이면 그 자리에서 새로 만든다.
const resolveTagIds = async (tx: Prisma.TransactionClient, names: string[]): Promise<number[]> => {
  const uniqueNames = [...new Set(names)];
  const tags = await Promise.all(
    uniqueNames.map(async (name) => {
      try {
        return await tx.tag.upsert({ where: { name }, update: {}, create: { name } });
      } catch (error) {
        // 동시에 같은 새 태그 이름으로 upsert가 경쟁하면, upsert 내부의 create가
        // unique 제약(P2002)에 걸릴 수 있다 - 그 사이 다른 트랜잭션이 먼저 만들었다는
        // 뜻이므로, 실패로 처리하지 않고 그 행을 다시 조회해서 재사용한다.
        if (isUniqueConstraintError(error)) {
          return tx.tag.findUniqueOrThrow({ where: { name } });
        }
        throw error;
      }
    }),
  );

  return tags.map((tag) => tag.id);
};

export class PrismaDesignRepository implements DesignRepository {
  // 디자인 피드 조회 - 커서 기반(keyset) 페이지네이션
  // offset 없이 "마지막으로 본 항목 이후" 조건으로 다음 페이지를 가져오므로 count 쿼리가 필요 없다.
  async findFeed(
    cursor: DesignCursor | undefined,
    category: string | undefined,
    size: number,
  ): Promise<{ designs: DesignSummaryRecord[]; hasNext: boolean }> {
    // size보다 1개 더 가져와서, 그 1개가 존재하면 다음 페이지가 있다는 뜻으로 사용한다(count 쿼리 대체).
    const rows = await getPrisma().design.findMany({
      select: {
        id: true,
        title: true,
        imageUrl: true,
        viewCount: true,
        createdAt: true,
        tags: { select: { tag: { select: { name: true } } }, orderBy: { tagId: 'asc' } },
        _count: { select: { wishes: true } },
      },
      where: {
        // (createdAt, id) 둘 다 내림차순 정렬 기준과 같은 방향으로 비교해야 커서 이후 항목만 걸러진다.
        ...(cursor && {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        }),
        // "카테고리 탭" = 이 태그가 달린 디자인만 필터링. 존재하지 않는 태그 이름이면
        // 그냥 빈 배열이 나온다(에러 아님).
        ...(category && { tags: { some: { tag: { name: category } } } }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: size + 1,
    });

    const hasNext = rows.length > size;
    const page = hasNext ? rows.slice(0, size) : rows;

    return {
      designs: page.map((row) => ({
        id: row.id,
        title: row.title,
        imageUrl: row.imageUrl,
        tags: row.tags.map((t) => t.tag.name),
        viewCount: row.viewCount,
        wishCount: row._count.wishes,
        createdAt: row.createdAt,
      })),
      hasNext,
    };
  }

  // 디자인 상세 조회 - 이미지 목록(등록 순서)과 찜 개수 포함
  async findDetailById(designId: number): Promise<DesignDetailRecord | null> {
    const design = await getPrisma().design.findUnique({
      where: { id: designId },
      select: {
        id: true,
        title: true,
        viewCount: true,
        durationMinutes: true,
        difficulty: true,
        recommendedShape: true,
        description: true,
        images: { select: { imageUrl: true }, orderBy: { id: 'asc' } },
        tags: { select: { tag: { select: { name: true } } }, orderBy: { tagId: 'asc' } },
        _count: { select: { wishes: true } },
      },
    });

    if (!design) return null;

    return {
      id: design.id,
      title: design.title,
      tags: design.tags.map((t) => t.tag.name),
      viewCount: design.viewCount,
      durationMinutes: design.durationMinutes,
      difficulty: design.difficulty,
      recommendedShape: design.recommendedShape,
      description: design.description,
      images: design.images.map((image) => image.imageUrl),
      wishCount: design._count.wishes,
    };
  }

  // 상세 조회 시 조회수 1 증가 (단순 증가, 유니크 방문 추적 없음)
  // 증가 후 값을 반환해 서비스가 재조회 없이 정확한 값을 응답에 담을 수 있게 한다
  // (동시 요청 시 증가 전 값 기준으로 +1을 추정하면 실제 DB 값과 어긋날 수 있다).
  async incrementViewCount(designId: number): Promise<number> {
    const updated = await getPrisma().design.update({
      where: { id: designId },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    });

    return updated.viewCount;
  }

  // 요청자가 이 디자인을 찜했는지 여부
  async isWishedByUser(designId: number, userId: number): Promise<boolean> {
    const wish = await getPrisma().wishDesign.findUnique({
      where: { designId_userId: { designId, userId } },
    });

    return wish !== null;
  }

  // 찜 생성/삭제 전 존재 확인용 - 상세 조회(findDetailById)보다 가벼운 select만 쓴다.
  async existsById(designId: number): Promise<boolean> {
    const design = await getPrisma().design.findUnique({
      where: { id: designId },
      select: { id: true },
    });

    return design !== null;
  }

  // 디자인 찜 생성 - upsert로 멱등 처리한다(이미 찜한 상태에서 다시 호출해도 에러 없이
  // 같은 결과). 하트 토글 UI 특성상 프론트가 "찜 안 한 상태"를 정확히 안다고 가정하기
  // 어려워, service.createWish()에서도 이미 찜한 경우를 성공으로 취급하는 정책과 짝을 이룬다.
  async createWish(designId: number, userId: number): Promise<{ wishCount: number }> {
    await getPrisma().wishDesign.upsert({
      where: { designId_userId: { designId, userId } },
      update: {},
      create: { designId, userId },
    });

    const wishCount = await getPrisma().wishDesign.count({ where: { designId } });
    return { wishCount };
  }

  // 디자인 찜 삭제 - deleteMany는 대상이 없어도 에러 없이 0건 삭제로 끝나므로
  // 찜 안 한 상태에서 호출해도 자연스럽게 멱등하게 수렴한다.
  async deleteWish(designId: number, userId: number): Promise<{ wishCount: number }> {
    await getPrisma().wishDesign.deleteMany({ where: { designId, userId } });

    const wishCount = await getPrisma().wishDesign.count({ where: { designId } });
    return { wishCount };
  }

  // 내가 찜한 디자인 목록 - WishDesign.createdAt("찜한 시점") 기준 커서 페이지네이션.
  // findFeed와 동일하게 size보다 1개 더 가져와 다음 페이지 존재 여부를 판단한다.
  async findWishlistByUserId(
    userId: number,
    cursor: WishCursor | undefined,
    size: number,
  ): Promise<{ items: WishlistItemRecord[]; hasNext: boolean }> {
    const rows = await getPrisma().wishDesign.findMany({
      where: {
        userId,
        ...(cursor && {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: size + 1,
      select: {
        id: true,
        createdAt: true,
        design: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            viewCount: true,
            tags: { select: { tag: { select: { name: true } } }, orderBy: { tagId: 'asc' } },
            _count: { select: { wishes: true } },
          },
        },
      },
    });

    const hasNext = rows.length > size;
    const page = hasNext ? rows.slice(0, size) : rows;

    return {
      items: page.map((row) => ({
        id: row.design.id,
        title: row.design.title,
        imageUrl: row.design.imageUrl,
        tags: row.design.tags.map((t) => t.tag.name),
        viewCount: row.design.viewCount,
        wishCount: row.design._count.wishes,
        wishId: row.id,
        wishedAt: row.createdAt,
      })),
      hasNext,
    };
  }

  // 관리자 디자인 생성 - 이미지 목록/태그를 한 트랜잭션으로 함께 만든다.
  async create(data: CreateDesignData): Promise<DesignAdminRecord> {
    const design = await getPrisma().$transaction(async (tx) => {
      const tagIds = await resolveTagIds(tx, data.tags);

      return tx.design.create({
        data: {
          title: data.title,
          imageUrl: data.imageUrl,
          durationMinutes: data.durationMinutes,
          difficulty: data.difficulty,
          recommendedShape: data.recommendedShape,
          description: data.description,
          images: { create: data.images.map((imageUrl) => ({ imageUrl })) },
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
        select: designAdminSelect,
      });
    });

    return mapDesignAdminRecord(design);
  }

  // 관리자 디자인 수정(PATCH) - images/tags가 전달되면 기존 목록을 통째로 대체한다.
  // 존재하지 않는 designId면 Prisma가 P2025를 던지고, 그대로 서비스로 전파한다
  // (reservation/design 다른 write 로직과 동일하게 repository는 매핑만, 에러 판단은 service).
  async update(designId: number, data: UpdateDesignData): Promise<DesignAdminRecord> {
    const design = await getPrisma().$transaction(async (tx) => {
      const updateData: Prisma.DesignUpdateInput = {};

      if (data.title !== undefined) updateData.title = data.title;
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
      if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes;
      if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
      if (data.recommendedShape !== undefined) updateData.recommendedShape = data.recommendedShape;
      if (data.description !== undefined) updateData.description = data.description;

      if (data.images !== undefined) {
        await tx.designImage.deleteMany({ where: { designId } });
        updateData.images = { create: data.images.map((imageUrl) => ({ imageUrl })) };
      }

      if (data.tags !== undefined) {
        const tagIds = await resolveTagIds(tx, data.tags);
        await tx.designTag.deleteMany({ where: { designId } });
        updateData.tags = { create: tagIds.map((tagId) => ({ tagId })) };
      }

      return tx.design.update({
        where: { id: designId },
        data: updateData,
        select: designAdminSelect,
      });
    });

    return mapDesignAdminRecord(design);
  }

  // 관리자 디자인 삭제 - DesignImage/WishDesign/DesignTag는 FK cascade로 함께 삭제된다.
  async delete(designId: number): Promise<void> {
    await getPrisma().design.delete({ where: { id: designId } });
  }
}
