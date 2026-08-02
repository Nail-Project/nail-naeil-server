import { describe, expect, it, beforeEach } from 'vitest';
import { Prisma } from '../../src/generated/prisma/client';
import type {
  DesignAdminRecord,
  DesignDetailRecord,
  DesignRepository,
  DesignSummaryRecord,
} from '../../src/design/repository/design.repository';
import { DesignService } from '../../src/design/service/design.service';
import type { DesignCursor } from '../../src/design/dto/get-designs-request';
import { encodeCursor } from '../../src/common/pagination/cursor';

class FakeRepository implements DesignRepository {
  feedResult: { designs: DesignSummaryRecord[]; hasNext: boolean } = {
    designs: [],
    hasNext: false,
  };
  detailResult: DesignDetailRecord | null = {
    id: 1,
    title: '도트 프렌치 네일',
    tags: ['여름네일', '아트', '키치'],
    viewCount: 7599,
    durationMinutes: 90,
    difficulty: '높음',
    recommendedShape: '스퀘어',
    description: '민트 프렌치 라인 위에 작은 도트 포인트를 더한 디자인입니다.',
    images: ['https://.../design1-1.jpg', 'https://.../design1-2.jpg'],
    wishCount: 901,
  };
  wished = false;
  viewCountAfterIncrement = 7600;
  incrementError: unknown = null;
  findFeedArgs: Array<{ cursor: DesignCursor | undefined; size: number }> = [];
  incrementedIds: number[] = [];
  isWishedByUserArgs: Array<{ designId: number; userId: number }> = [];

  async findFeed(
    cursor: DesignCursor | undefined,
    size: number,
  ): Promise<{ designs: DesignSummaryRecord[]; hasNext: boolean }> {
    this.findFeedArgs.push({ cursor, size });
    return this.feedResult;
  }

  async findDetailById(): Promise<DesignDetailRecord | null> {
    return this.detailResult;
  }

  async incrementViewCount(designId: number): Promise<number> {
    this.incrementedIds.push(designId);
    if (this.incrementError) throw this.incrementError;
    return this.viewCountAfterIncrement;
  }

  async isWishedByUser(designId: number, userId: number): Promise<boolean> {
    this.isWishedByUserArgs.push({ designId, userId });
    return this.wished;
  }

  // 이 파일은 읽기(getDesigns/getDesignDetail) 서비스 테스트 전용이라 관리자 CRUD 메서드는
  // 실제로 쓰이지 않는다 - 인터페이스를 만족시키기 위한 최소 스텁만 둔다.
  async create(): Promise<DesignAdminRecord> {
    throw new Error('not implemented in this fake');
  }

  async update(): Promise<DesignAdminRecord> {
    throw new Error('not implemented in this fake');
  }

  async delete(): Promise<void> {
    throw new Error('not implemented in this fake');
  }
}

const userId = 1;
const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('DB 에러', { code, clientVersion: 'test' });

describe('DesignService.getDesigns', () => {
  let repository: FakeRepository;
  let service: DesignService;

  beforeEach(() => {
    repository = new FakeRepository();
    service = new DesignService(repository);
  });

  it('디자인 목록을 응답 형식에 맞게 매핑한다 (내부 전용 createdAt은 응답에 포함되지 않는다)', async () => {
    repository.feedResult = {
      designs: [
        {
          id: 1,
          title: '글리터 프렌치',
          imageUrl: 'https://.../design1.jpg',
          tags: ['프렌치', '글리터'],
          viewCount: 9359,
          wishCount: 312,
          createdAt: new Date('2026-07-27T04:59:00.000Z'),
        },
      ],
      hasNext: false,
    };

    const result = await service.getDesigns(undefined, 10);

    expect(result).toEqual({
      designs: [
        {
          designId: 1,
          title: '글리터 프렌치',
          imageUrl: 'https://.../design1.jpg',
          tags: ['프렌치', '글리터'],
          viewCount: 9359,
          wishCount: 312,
        },
      ],
      pageInfo: { nextCursor: null, hasNext: false },
    });
  });

  it('다음 페이지가 있으면 마지막 항목 기준으로 nextCursor를 만든다', async () => {
    repository.feedResult = {
      designs: [
        {
          id: 1,
          title: '글리터 프렌치',
          imageUrl: 'https://.../design1.jpg',
          tags: ['프렌치', '글리터'],
          viewCount: 9359,
          wishCount: 312,
          createdAt: new Date('2026-07-27T04:59:00.000Z'),
        },
      ],
      hasNext: true,
    };

    const result = await service.getDesigns(undefined, 10);

    expect(result.pageInfo.hasNext).toBe(true);
    expect(result.pageInfo.nextCursor).toBe(
      encodeCursor({ createdAt: '2026-07-27T04:59:00.000Z', id: 1 }),
    );
  });

  it('요청한 cursor/size를 그대로 repository에 전달한다', async () => {
    const cursor: DesignCursor = { createdAt: new Date('2026-07-27T04:59:00.000Z'), id: 9 };

    await service.getDesigns(cursor, 15);

    expect(repository.findFeedArgs).toEqual([{ cursor, size: 15 }]);
  });
});

describe('DesignService.getDesignDetail', () => {
  let repository: FakeRepository;
  let service: DesignService;

  beforeEach(() => {
    repository = new FakeRepository();
    service = new DesignService(repository);
  });

  it('존재하지 않는 디자인이면 404를 던진다', async () => {
    repository.detailResult = null;

    await expect(service.getDesignDetail(999, userId)).rejects.toMatchObject({
      code: 'DESIGN_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('상세 조회 시 조회수를 반영하고 repository가 반환한 증가 후 값을 응답에 담는다', async () => {
    repository.viewCountAfterIncrement = 7600;

    const result = await service.getDesignDetail(1, userId);

    expect(repository.incrementedIds).toEqual([1]);
    expect(result.viewCount).toBe(7600);
  });

  it('조회수 증가 도중 디자인이 삭제되면(P2025) 404를 던진다', async () => {
    repository.incrementError = prismaError('P2025');

    await expect(service.getDesignDetail(1, userId)).rejects.toMatchObject({
      code: 'DESIGN_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('요청한 designId와 userId를 그대로 repository에 전달한다', async () => {
    await service.getDesignDetail(1, userId);

    expect(repository.isWishedByUserArgs).toEqual([{ designId: 1, userId }]);
  });

  it('찜한 디자인이면 isBookmarked가 true다', async () => {
    repository.wished = true;

    const result = await service.getDesignDetail(1, userId);

    expect(result.isBookmarked).toBe(true);
  });

  it('찜하지 않은 디자인이면 isBookmarked가 false다', async () => {
    repository.wished = false;

    const result = await service.getDesignDetail(1, userId);

    expect(result.isBookmarked).toBe(false);
  });

  it('이미지 목록과 나머지 필드를 응답 형식에 맞게 매핑한다', async () => {
    const result = await service.getDesignDetail(1, userId);

    expect(result).toMatchObject({
      designId: 1,
      title: '도트 프렌치 네일',
      images: ['https://.../design1-1.jpg', 'https://.../design1-2.jpg'],
      tags: ['여름네일', '아트', '키치'],
      wishCount: 901,
      durationMinutes: 90,
      difficulty: '높음',
      recommendedShape: '스퀘어',
    });
  });
});
