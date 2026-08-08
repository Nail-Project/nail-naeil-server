import { describe, expect, it, beforeEach } from 'vitest';
import { Prisma } from '../../src/generated/prisma/client';
import type { ReservationStatus } from '../../src/generated/prisma/enums';
import type {
  CreatedReviewRecord,
  ReservationForReviewRecord,
  ReviewRepository,
} from '../../src/review/repository/review.repository';
import { ReviewService } from '../../src/review/service/review.service';
import type { CreateReviewRequestType } from '../../src/review/dto/request/create-review-request';

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
}

const userId = 1;
const dto: CreateReviewRequestType = { rating: 5, content: '시술이 꼼꼼하고 만족스러웠어요!' };
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
