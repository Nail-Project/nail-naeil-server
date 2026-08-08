import { describe, expect, it, beforeEach } from 'vitest';
import { Prisma } from '../../src/generated/prisma/client';
import type {
  CreateDesignData,
  DesignAdminRecord,
  DesignDetailRecord,
  DesignRepository,
  DesignSummaryRecord,
  UpdateDesignData,
  WishlistItemRecord,
} from '../../src/design/repository/design.repository';
import { DesignAdminService } from '../../src/design/service/design-admin.service';

class FakeRepository implements DesignRepository {
  createResult: DesignAdminRecord = {
    id: 1,
    title: '글리터 프렌치',
    imageUrl: 'https://.../design1.jpg',
    images: ['https://.../design1-1.jpg'],
    tags: ['프렌치', '글리터'],
    durationMinutes: 60,
    difficulty: '보통',
    recommendedShape: '라운드',
    description: '설명',
  };
  updateResult: DesignAdminRecord = this.createResult;
  updateError: unknown = null;
  deleteError: unknown = null;
  createArgs: CreateDesignData[] = [];
  updateArgs: Array<{ designId: number; data: UpdateDesignData }> = [];
  deletedIds: number[] = [];

  async findFeed(): Promise<{ designs: DesignSummaryRecord[]; hasNext: boolean }> {
    return { designs: [], hasNext: false };
  }

  async findDetailById(): Promise<DesignDetailRecord | null> {
    return null;
  }

  async incrementViewCount(): Promise<number> {
    return 0;
  }

  async isWishedByUser(): Promise<boolean> {
    return false;
  }

  // 이 파일은 관리자 CRUD(create/update/delete) 서비스 테스트 전용이라 찜 관련 메서드는
  // 실제로 쓰이지 않는다 - 인터페이스를 만족시키기 위한 최소 스텁만 둔다.
  async existsById(): Promise<boolean> {
    return false;
  }

  async createWish(): Promise<{ wishCount: number }> {
    throw new Error('not implemented in this fake');
  }

  async deleteWish(): Promise<{ wishCount: number }> {
    throw new Error('not implemented in this fake');
  }

  async findWishlistByUserId(): Promise<{ items: WishlistItemRecord[]; hasNext: boolean }> {
    return { items: [], hasNext: false };
  }

  async create(data: CreateDesignData): Promise<DesignAdminRecord> {
    this.createArgs.push(data);
    return this.createResult;
  }

  async update(designId: number, data: UpdateDesignData): Promise<DesignAdminRecord> {
    this.updateArgs.push({ designId, data });
    if (this.updateError) throw this.updateError;
    return this.updateResult;
  }

  async delete(designId: number): Promise<void> {
    this.deletedIds.push(designId);
    if (this.deleteError) throw this.deleteError;
  }
}

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('DB 에러', { code, clientVersion: 'test' });

const createDto: CreateDesignData = {
  title: '글리터 프렌치',
  imageUrl: 'https://.../design1.jpg',
  durationMinutes: 60,
  difficulty: '보통',
  recommendedShape: '라운드',
  description: '설명',
  images: ['https://.../design1-1.jpg'],
  tags: ['프렌치', '글리터'],
};

describe('DesignAdminService.createDesign', () => {
  let repository: FakeRepository;
  let service: DesignAdminService;

  beforeEach(() => {
    repository = new FakeRepository();
    service = new DesignAdminService(repository);
  });

  it('요청값을 그대로 repository.create에 전달한다', async () => {
    await service.createDesign(createDto);

    expect(repository.createArgs).toEqual([createDto]);
  });

  it('생성 결과를 응답 형식에 맞게 매핑한다', async () => {
    const result = await service.createDesign(createDto);

    expect(result).toEqual({
      designId: 1,
      title: '글리터 프렌치',
      imageUrl: 'https://.../design1.jpg',
      images: ['https://.../design1-1.jpg'],
      tags: ['프렌치', '글리터'],
      durationMinutes: 60,
      difficulty: '보통',
      recommendedShape: '라운드',
      description: '설명',
    });
  });
});

describe('DesignAdminService.updateDesign', () => {
  let repository: FakeRepository;
  let service: DesignAdminService;

  beforeEach(() => {
    repository = new FakeRepository();
    service = new DesignAdminService(repository);
  });

  it('designId와 수정값을 그대로 repository.update에 전달한다', async () => {
    await service.updateDesign(1, { title: '수정된 제목' });

    expect(repository.updateArgs).toEqual([{ designId: 1, data: { title: '수정된 제목' } }]);
  });

  it('존재하지 않는 디자인이면(P2025) 404를 던진다', async () => {
    repository.updateError = prismaError('P2025');

    await expect(service.updateDesign(999, { title: 'x' })).rejects.toMatchObject({
      code: 'DESIGN_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('P2025가 아닌 에러는 그대로 전파한다', async () => {
    const originalError = new Error('알 수 없는 DB 오류');
    repository.updateError = originalError;

    await expect(service.updateDesign(1, { title: 'x' })).rejects.toBe(originalError);
  });
});

describe('DesignAdminService.deleteDesign', () => {
  let repository: FakeRepository;
  let service: DesignAdminService;

  beforeEach(() => {
    repository = new FakeRepository();
    service = new DesignAdminService(repository);
  });

  it('요청한 designId로 repository.delete를 호출한다', async () => {
    await service.deleteDesign(1);

    expect(repository.deletedIds).toEqual([1]);
  });

  it('존재하지 않는 디자인이면(P2025) 404를 던진다', async () => {
    repository.deleteError = prismaError('P2025');

    await expect(service.deleteDesign(999)).rejects.toMatchObject({
      code: 'DESIGN_NOT_FOUND',
      statusCode: 404,
    });
  });
});
