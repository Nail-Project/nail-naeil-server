import { describe, expect, it, beforeEach } from 'vitest';
import { Prisma } from '../../src/generated/prisma/client';
import type { ReservationStatus } from '../../src/generated/prisma/enums';
import type {
  CreatedReviewRecord,
  ReservationForReviewRecord,
  ReviewOwnerRecord,
  ReviewRepository,
  ShopReviewRecord,
  UpdatedReviewRecord,
} from '../../src/review/repository/review.repository';
import { ReviewService } from '../../src/review/service/review.service';
import type { CreateReviewRequestType } from '../../src/review/dto/request/create-review-request';
import type { ShopReviewCursor } from '../../src/review/dto/request/get-shop-reviews-request';

class FakeRepository implements ReviewRepository {
  reservationResult: ReservationForReviewRecord | null = {
    id: 1n,
    status: 'COMPLETED' as ReservationStatus,
    proposal: { shopId: 5 },
  };
  alreadyReviewed = false;
  createResult: CreatedReviewRecord = {
    id: 100,
    reservationId: 1n,
    shopId: 5,
    rating: 5,
    content: '시술이 꼼꼼하고 만족스러웠어요!',
    createdAt: new Date('2026-08-08T10:00:00.000Z'),
  };
  createError: unknown = null;
  lastCreateArgs: {
    reservationId: bigint;
    shopId: number;
    userId: number;
    rating: number;
    content: string;
  } | null = null;

  ownerResult: ReviewOwnerRecord | null = { id: 100, shopId: 5 };
  updateResult: UpdatedReviewRecord = {
    id: 100,
    reservationId: 1n,
    shopId: 5,
    rating: 4,
    content: '다시 생각해보니 조금 아쉬운 점도 있었어요.',
    updatedAt: new Date('2026-08-09T10:00:00.000Z'),
  };
  updateError: unknown = null;
  deleteError: unknown = null;
  shopExistsResult = true;
  findByShopIdResult: { items: ShopReviewRecord[]; hasNext: boolean } = {
    items: [
      {
        id: 100,
        rating: 5,
        content: '시술이 꼼꼼하고 만족스러웠어요!',
        createdAt: new Date('2026-08-08T10:00:00.000Z'),
        user: { nickname: '네일러버' },
      },
    ],
    hasNext: false,
  };

  async findReservationForReview(): Promise<ReservationForReviewRecord | null> {
    return this.reservationResult;
  }

  async existsByReservationId(): Promise<boolean> {
    return this.alreadyReviewed;
  }

  async create(data: {
    reservationId: bigint;
    shopId: number;
    userId: number;
    rating: number;
    content: string;
  }): Promise<CreatedReviewRecord> {
    this.lastCreateArgs = data;
    if (this.createError) throw this.createError;
    return this.createResult;
  }

  async findByIdForOwner(): Promise<ReviewOwnerRecord | null> {
    return this.ownerResult;
  }

  async update(): Promise<UpdatedReviewRecord> {
    if (this.updateError) throw this.updateError;
    return this.updateResult;
  }

  async delete(): Promise<void> {
    if (this.deleteError) throw this.deleteError;
  }

  async shopExists(): Promise<boolean> {
    return this.shopExistsResult;
  }

  async findByShopId(): Promise<{ items: ShopReviewRecord[]; hasNext: boolean }> {
    return this.findByShopIdResult;
  }
}

const userId = 1;
const dto: CreateReviewRequestType = {
  reservationId: 1,
  rating: 5,
  content: '시술이 꼼꼼하고 만족스러웠어요!',
};
const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('DB 에러', { code, clientVersion: 'test' });

describe('ReviewService.createReview', () => {
  let repository: FakeRepository;
  let service: ReviewService;

  beforeEach(() => {
    repository = new FakeRepository();
    service = new ReviewService(repository);
  });

  it('완료된 예약이면 정상적으로 리뷰를 작성한다', async () => {
    await expect(service.createReview(1n, userId, dto)).resolves.toEqual({
      reviewId: 100,
      reservationId: 1,
      shopId: 5,
      rating: 5,
      content: '시술이 꼼꼼하고 만족스러웠어요!',
      createdAt: new Date('2026-08-08T10:00:00.000Z'),
    });

    expect(repository.lastCreateArgs).toEqual({
      reservationId: 1n,
      shopId: 5,
      userId,
      rating: 5,
      content: '시술이 꼼꼼하고 만족스러웠어요!',
    });
  });

  it('존재하지 않거나 본인 소유가 아닌 예약이면 404를 던진다', async () => {
    repository.reservationResult = null;

    await expect(service.createReview(1n, userId, dto)).rejects.toMatchObject({
      code: 'REVIEW_RESERVATION_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('아직 확정(CONFIRMED) 상태인 예약이면 409를 던진다', async () => {
    repository.reservationResult = {
      id: 1n,
      status: 'CONFIRMED',
      proposal: { shopId: 5 },
    };

    await expect(service.createReview(1n, userId, dto)).rejects.toMatchObject({
      code: 'REVIEW_NOT_ALLOWED',
      statusCode: 409,
    });
  });

  it('취소(CANCELLED)된 예약이면 409를 던진다', async () => {
    repository.reservationResult = {
      id: 1n,
      status: 'CANCELLED',
      proposal: { shopId: 5 },
    };

    await expect(service.createReview(1n, userId, dto)).rejects.toMatchObject({
      code: 'REVIEW_NOT_ALLOWED',
      statusCode: 409,
    });
  });

  it('이미 리뷰를 작성한 예약이면 409를 던진다 (사전 체크)', async () => {
    repository.alreadyReviewed = true;

    await expect(service.createReview(1n, userId, dto)).rejects.toMatchObject({
      code: 'REVIEW_ALREADY_EXISTS',
      statusCode: 409,
    });
  });

  it('사전 체크 통과 후 동시 작성 경쟁 상태(P2002)면 409를 던진다', async () => {
    repository.createError = prismaError('P2002');

    await expect(service.createReview(1n, userId, dto)).rejects.toMatchObject({
      code: 'REVIEW_ALREADY_EXISTS',
      statusCode: 409,
    });
  });

  it('알 수 없는 에러는 500으로 변환하고 원본 에러를 data에 담는다', async () => {
    const originalError = new Error('예상치 못한 DB 오류');
    repository.createError = originalError;

    await expect(service.createReview(1n, userId, dto)).rejects.toMatchObject({
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
      reservationId: 1,
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
});

describe('ReviewService.getShopReviews', () => {
  let repository: FakeRepository;
  let service: ReviewService;

  beforeEach(() => {
    repository = new FakeRepository();
    service = new ReviewService(repository);
  });

  it('샵이 존재하면 리뷰 목록을 반환한다', async () => {
    await expect(service.getShopReviews(5, undefined, 10)).resolves.toEqual({
      reviews: [
        {
          reviewId: 100,
          nickname: '네일러버',
          rating: 5,
          content: '시술이 꼼꼼하고 만족스러웠어요!',
          createdAt: new Date('2026-08-08T10:00:00.000Z'),
        },
      ],
      pageInfo: { nextCursor: null, hasNext: false },
    });
  });

  it('존재하지 않는 샵이면 404를 던진다', async () => {
    repository.shopExistsResult = false;

    await expect(service.getShopReviews(999, undefined, 10)).rejects.toMatchObject({
      code: 'REVIEW_SHOP_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('다음 페이지가 있으면 nextCursor를 인코딩해 반환한다', async () => {
    repository.findByShopIdResult = { items: repository.findByShopIdResult.items, hasNext: true };

    const result = await service.getShopReviews(5, undefined, 10);

    expect(result.pageInfo.hasNext).toBe(true);
    expect(result.pageInfo.nextCursor).not.toBeNull();

    const decoded = JSON.parse(
      Buffer.from(result.pageInfo.nextCursor as string, 'base64url').toString('utf-8'),
    ) as ShopReviewCursor;
    expect(decoded.id).toBe(100);
  });
});
