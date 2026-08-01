import { getPrisma } from '../../infra/prisma';
import type { DesignCursor } from '../dto/get-designs-request';

export interface DesignSummaryRecord {
  id: number;
  title: string;
  imageUrl: string;
  tag: string;
  // 커서 생성에만 쓰는 내부 필드 - 응답 DTO 매핑 시엔 사용하지 않는다.
  createdAt: Date;
}

export interface DesignDetailRecord {
  id: number;
  title: string;
  tag: string;
  viewCount: number;
  durationMinutes: number;
  difficulty: string;
  recommendedShape: string;
  description: string;
  images: string[];
  wishCount: number;
}

export interface DesignRepository {
  findFeed(
    cursor: DesignCursor | undefined,
    size: number,
  ): Promise<{ designs: DesignSummaryRecord[]; hasNext: boolean }>;
  findDetailById(designId: number): Promise<DesignDetailRecord | null>;
  incrementViewCount(designId: number): Promise<number>;
  isWishedByUser(designId: number, userId: number): Promise<boolean>;
}

export class PrismaDesignRepository implements DesignRepository {
  // 디자인 피드 조회 - 커서 기반(keyset) 페이지네이션
  // offset 없이 "마지막으로 본 항목 이후" 조건으로 다음 페이지를 가져오므로 count 쿼리가 필요 없다.
  async findFeed(
    cursor: DesignCursor | undefined,
    size: number,
  ): Promise<{ designs: DesignSummaryRecord[]; hasNext: boolean }> {
    // size보다 1개 더 가져와서, 그 1개가 존재하면 다음 페이지가 있다는 뜻으로 사용한다(count 쿼리 대체).
    const rows = await getPrisma().design.findMany({
      select: { id: true, title: true, imageUrl: true, tag: true, createdAt: true },
      where: cursor && {
        // (createdAt, id) 둘 다 내림차순 정렬 기준과 같은 방향으로 비교해야 커서 이후 항목만 걸러진다.
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: size + 1,
    });

    const hasNext = rows.length > size;

    return { designs: hasNext ? rows.slice(0, size) : rows, hasNext };
  }

  // 디자인 상세 조회 - 이미지 목록(등록 순서)과 찜 개수 포함
  async findDetailById(designId: number): Promise<DesignDetailRecord | null> {
    const design = await getPrisma().design.findUnique({
      where: { id: designId },
      select: {
        id: true,
        title: true,
        tag: true,
        viewCount: true,
        durationMinutes: true,
        difficulty: true,
        recommendedShape: true,
        description: true,
        images: { select: { imageUrl: true }, orderBy: { id: 'asc' } },
        _count: { select: { wishes: true } },
      },
    });

    if (!design) return null;

    return {
      id: design.id,
      title: design.title,
      tag: design.tag,
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
}
