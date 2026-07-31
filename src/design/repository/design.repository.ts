import { getPrisma } from '../../infra/prisma';

export interface DesignSummaryRecord {
  id: number;
  title: string;
  imageUrl: string;
  tag: string;
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
    page: number,
    size: number,
  ): Promise<{ designs: DesignSummaryRecord[]; totalElements: number }>;
  findDetailById(designId: number): Promise<DesignDetailRecord | null>;
  incrementViewCount(designId: number): Promise<void>;
  isWishedByUser(designId: number, userId: number): Promise<boolean>;
}

export class PrismaDesignRepository implements DesignRepository {
  // 디자인 피드 조회 (page는 1부터 시작)
  async findFeed(
    page: number,
    size: number,
  ): Promise<{ designs: DesignSummaryRecord[]; totalElements: number }> {
    const [designs, totalElements] = await getPrisma().$transaction([
      getPrisma().design.findMany({
        select: { id: true, title: true, imageUrl: true, tag: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      getPrisma().design.count(),
    ]);

    return { designs, totalElements };
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
  async incrementViewCount(designId: number): Promise<void> {
    await getPrisma().design.update({
      where: { id: designId },
      data: { viewCount: { increment: 1 } },
    });
  }

  // 요청자가 이 디자인을 찜했는지 여부
  async isWishedByUser(designId: number, userId: number): Promise<boolean> {
    const wish = await getPrisma().wishDesign.findUnique({
      where: { designId_userId: { designId, userId } },
    });

    return wish !== null;
  }
}
