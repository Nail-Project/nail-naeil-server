import { describe, expect, it, beforeEach } from 'vitest';
import { Prisma } from '../../src/generated/prisma/client';
import type {
  CompletedReservationRecord,
  ReviewOwnerRecord,
  ReviewRepository,
  ShopReviewRecord,
  UpdatedShopReviewRecord,
} from '../../src/review/repository/review.repository';
import { ReviewService } from '../../src/review/service/review.service';

class FakeRepository implements ReviewRepository {
  reservationResult: CompletedReservationRecord | null = { id: 1n };
  alreadyReviewed = false;
  createResult: ShopReviewRecord = {
    id: 100,
    shopId: 5,
    rating: 5,
    content: '시술이 꼼꼼하고 만족스러웠어요!',
    createdAt: new Date('2026-08-08T10:00:00.000Z'),
  };
  createError: unknown = null;
  lastCreateArgs: { shopId: number; userId: number; rating: number; content?: string } | null =
    null;

  ownerResult: ReviewOwnerRecord | null = { id: 100, shopId: 5 };
  updateResult: UpdatedShopReviewRecord = {
    id: 100,
    shopId: 5,
    rating: 4,
    content: '다시 생각해보니 조금 아쉬운 점도 있었어요.',
    updatedAt: new Date('2026-08-09T10:00:00.000Z'),
  };
  updateError: unknown = null;
  deleteError: unknown = null;

  async findCompletedReservationForShop(): Promise<CompletedReservationRecord | null> {
    return this.reservationResult;
  }

  async existsByShopAndUser(): Promise<boolean> {
    return this.alreadyReviewed;
  }

  async create(data: {
    shopId: number;
    userId: number;
    rating: number;
    content?: string;
  }): Promise<ShopReviewRecord> {
    this.lastCreateArgs = data;
    if (this.createError) throw this.createError;
    return this.createResult;
  }

  async findByIdForOwner(): Promise<ReviewOwnerRecord | null> {
    return this.ownerResult;
  }

  async update(): Promise<UpdatedShopReviewRecord> {
    if (this.updateError) throw this.updateError;
    return this.updateResult;
  }

  async delete(): Promise<void> {
    if (this.deleteError) throw this.deleteError;
  }
}

const shopId = 5;
const userId = 1;
const dto = { rating: 5, content: '시술이 꼼꼼하고 만족스러웠어요!' };
const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('DB 에러', { code, clientVersion: 'test' });

describe('ReviewService.createReview', () => {
  let repository: FakeRepository;
  let service: ReviewService;

  beforeEach(() => {
    repository = new FakeRepository();
    service = new ReviewService(repository);
  });

  it('해당 샵에서 완료된 예약이 있으면 정상적으로 리뷰를 작성한다', async () => {
    await expect(service.createReview(shopId, userId, dto)).resolves.toEqual({
      reviewId: 100,
      shopId: 5,
      rating: 5,
      content: '시술이 꼼꼼하고 만족스러웠어요!',
      createdAt: new Date('2026-08-08T10:00:00.000Z'),
    });

    expect(repository.lastCreateArgs).toEqual({
      shopId,
      userId,
      rating: 5,
      content: '시술이 꼼꼼하고 만족스러웠어요!',
    });
  });

  it('해당 샵에서 완료된 예약이 없으면 404를 던진다', async () => {
    repository.reservationResult = null;

    await expect(service.createReview(shopId, userId, dto)).rejects.toMatchObject({
      code: 'REVIEW_NOT_ELIGIBLE',
      statusCode: 404,
    });
  });

  it('이미 리뷰를 작성한 샵이면 409를 던진다 (사전 체크)', async () => {
    repository.alreadyReviewed = true;

    await expect(service.createReview(shopId, userId, dto)).rejects.toMatchObject({
      code: 'REVIEW_ALREADY_EXISTS',
      statusCode: 409,
    });
  });

  it('사전 체크 통과 후 동시 작성 경쟁 상태(P2002)면 409를 던진다', async () => {
    repository.createError = prismaError('P2002');

    await expect(service.createReview(shopId, userId, dto)).rejects.toMatchObject({
      code: 'REVIEW_ALREADY_EXISTS',
      statusCode: 409,
    });
  });

  it('알 수 없는 에러는 500으로 변환하고 원본 에러를 data에 담는다', async () => {
    const originalError = new Error('예상치 못한 DB 오류');
    repository.createError = originalError;

    await expect(service.createReview(shopId, userId, dto)).rejects.toMatchObject({
      code: 'REVIEW_FAILED',
      statusCode: 500,
      data: { originalError },
    });
  });
});

describe('ReviewService.updateReview', () => {
  let repository: FakeRepository;
  let service: ReviewService;

  beforeEach(() => {
    repository = new FakeRepository();
    service = new ReviewService(repository);
  });

  it('본인 리뷰면 정상적으로 수정한다', async () => {
    await expect(service.updateReview(100, userId, { rating: 4 })).resolves.toEqual({
      reviewId: 100,
      shopId: 5,
      rating: 4,
      content: '다시 생각해보니 조금 아쉬운 점도 있었어요.',
      updatedAt: new Date('2026-08-09T10:00:00.000Z'),
    });
  });

  it('존재하지 않거나 본인 작성이 아닌 리뷰면 404를 던진다', async () => {
    repository.ownerResult = null;

    await expect(service.updateReview(999, userId, { rating: 4 })).rejects.toMatchObject({
      code: 'REVIEW_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('수정 중 알 수 없는 에러는 500으로 변환한다', async () => {
    const originalError = new Error('예상치 못한 DB 오류');
    repository.updateError = originalError;

    await expect(service.updateReview(100, userId, { rating: 4 })).rejects.toMatchObject({
      code: 'REVIEW_FAILED',
      statusCode: 500,
      data: { originalError },
    });
  });

  it('소유권 확인 이후 삭제된 경쟁 상태(P2025)면 500 대신 404를 던진다', async () => {
    repository.updateError = prismaError('P2025');

    await expect(service.updateReview(100, userId, { rating: 4 })).rejects.toMatchObject({
      code: 'REVIEW_NOT_FOUND',
      statusCode: 404,
    });
  });
});

describe('ReviewService.deleteReview', () => {
  let repository: FakeRepository;
  let service: ReviewService;

  beforeEach(() => {
    repository = new FakeRepository();
    service = new ReviewService(repository);
  });

  it('본인 리뷰면 정상적으로 삭제한다', async () => {
    await expect(service.deleteReview(100, userId)).resolves.toEqual({ reviewId: 100 });
  });

  it('존재하지 않거나 본인 작성이 아닌 리뷰면 404를 던진다', async () => {
    repository.ownerResult = null;

    await expect(service.deleteReview(999, userId)).rejects.toMatchObject({
      code: 'REVIEW_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('삭제 중 알 수 없는 에러는 500으로 변환한다', async () => {
    const originalError = new Error('예상치 못한 DB 오류');
    repository.deleteError = originalError;

    await expect(service.deleteReview(100, userId)).rejects.toMatchObject({
      code: 'REVIEW_FAILED',
      statusCode: 500,
      data: { originalError },
    });
  });

  it('소유권 확인 이후 삭제된 경쟁 상태(P2025)면 500 대신 404를 던진다', async () => {
    repository.deleteError = prismaError('P2025');

    await expect(service.deleteReview(100, userId)).rejects.toMatchObject({
      code: 'REVIEW_NOT_FOUND',
      statusCode: 404,
    });
  });
});
