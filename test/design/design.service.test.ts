import { describe, expect, it, beforeEach } from 'vitest';
import type {
  DesignDetailRecord,
  DesignRepository,
  DesignSummaryRecord,
} from '../../src/design/repository/design.repository';
import { DesignService } from '../../src/design/service/design.service';

class FakeRepository implements DesignRepository {
  feedResult: { designs: DesignSummaryRecord[]; totalElements: number } = {
    designs: [],
    totalElements: 0,
  };
  detailResult: DesignDetailRecord | null = {
    id: 1,
    title: '도트 프렌치 네일',
    tag: '여름네일,아트,키치',
    viewCount: 7599,
    durationMinutes: 90,
    difficulty: '높음',
    recommendedShape: '스퀘어',
    description: '민트 프렌치 라인 위에 작은 도트 포인트를 더한 디자인입니다.',
    images: ['https://.../design1-1.jpg', 'https://.../design1-2.jpg'],
    wishCount: 901,
  };
  wished = false;
  incrementedIds: number[] = [];

  async findFeed(): Promise<{ designs: DesignSummaryRecord[]; totalElements: number }> {
    return this.feedResult;
  }

  async findDetailById(): Promise<DesignDetailRecord | null> {
    return this.detailResult;
  }

  async incrementViewCount(designId: number): Promise<void> {
    this.incrementedIds.push(designId);
  }

  async isWishedByUser(): Promise<boolean> {
    return this.wished;
  }
}

const userId = 1;

describe('DesignService.getDesigns', () => {
  let repository: FakeRepository;
  let service: DesignService;

  beforeEach(() => {
    repository = new FakeRepository();
    service = new DesignService(repository);
  });

  it('디자인 목록을 응답 형식에 맞게 매핑한다', async () => {
    repository.feedResult = {
      designs: [{ id: 1, title: '글리터 프렌치', imageUrl: 'https://.../design1.jpg', tag: '프렌치,글리터' }],
      totalElements: 45,
    };

    const result = await service.getDesigns(1, 10);

    expect(result).toEqual({
      designs: [
        { designId: 1, title: '글리터 프렌치', imageUrl: 'https://.../design1.jpg', tag: '프렌치,글리터' },
      ],
      pageInfo: { currentPage: 1, pageSize: 10, totalElements: 45, hasNext: true },
    });
  });

  it('마지막 페이지에서는 hasNext가 false다', async () => {
    repository.feedResult = { designs: [], totalElements: 10 };

    const result = await service.getDesigns(1, 10);

    expect(result.pageInfo.hasNext).toBe(false);
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

  it('상세 조회 시 조회수를 반영하고 +1된 값을 응답에 즉시 담는다', async () => {
    const result = await service.getDesignDetail(1, userId);

    expect(repository.incrementedIds).toEqual([1]);
    expect(result.viewCount).toBe(7600); // 기존 7599 + 1
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
      tag: '여름네일,아트,키치',
      wishCount: 901,
      durationMinutes: 90,
      difficulty: '높음',
      recommendedShape: '스퀘어',
    });
  });
});
