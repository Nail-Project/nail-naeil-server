import { getPrisma } from '../../infra/prisma';
import { Prisma } from '../../generated/prisma/client';
import type { ReservationStatus } from '../../generated/prisma/enums';
import type { ShopReviewCursor } from '../dto/request/get-shop-reviews-request';

export interface ReservationForReviewRecord {
  id: bigint;
  status: ReservationStatus;
  proposal: { shopId: number };
}

export interface CreatedReviewRecord {
  id: number;
  reservationId: bigint;
  shopId: number;
  rating: number;
  content: string;
  createdAt: Date;
}

export interface ReviewOwnerRecord {
  id: number;
  shopId: number;
}

export interface UpdatedReviewRecord {
  id: number;
  reservationId: bigint;
  shopId: number;
  rating: number;
  content: string;
  updatedAt: Date;
}

export interface ShopReviewRecord {
  id: number;
  rating: number;
  content: string;
  createdAt: Date;
  user: { nickname: string | null };
}

export interface ReviewRepository {
  findReservationForReview(
    reservationId: bigint,
    userId: number,
  ): Promise<ReservationForReviewRecord | null>;
  existsByReservationId(reservationId: bigint): Promise<boolean>;
  create(data: {
    reservationId: bigint;
    shopId: number;
    userId: number;
    rating: number;
    content: string;
  }): Promise<CreatedReviewRecord>;
  findByIdForOwner(reviewId: number, userId: number): Promise<ReviewOwnerRecord | null>;
  update(
    reviewId: number,
    shopId: number,
    data: { rating?: number; content?: string },
  ): Promise<UpdatedReviewRecord>;
  delete(reviewId: number, shopId: number): Promise<void>;
  shopExists(shopId: number): Promise<boolean>;
  findByShopId(
    shopId: number,
    cursor: ShopReviewCursor | undefined,
    size: number,
  ): Promise<{ items: ShopReviewRecord[]; hasNext: boolean }>;
}

// 리뷰 생성/수정/삭제 시 샵 평점/리뷰수를 항상 최신 상태로 재계산한다.
// Shop.rating은 DECIMAL(2,1) 컬럼이라 소수 첫째 자리까지만 반올림해서 저장한다.
const recalculateShopRating = async (
  tx: Prisma.TransactionClient,
  shopId: number,
): Promise<void> => {
  const aggregate = await tx.review.aggregate({
    where: { shopId },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await tx.shop.update({
    where: { id: shopId },
    data: {
      rating: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
      reviewCount: aggregate._count._all,
    },
  });
};

export class PrismaReviewRepository implements ReviewRepository {
  // 리뷰 작성 전 소유권 + 현재 상태(완료 여부) 확인용. shopId는 견적(EstimateResponse)에서 가져온다.
  async findReservationForReview(
    reservationId: bigint,
    userId: number,
  ): Promise<ReservationForReviewRecord | null> {
    return await getPrisma().reservation.findFirst({
      where: { id: reservationId, userId },
      select: {
        id: true,
        status: true,
        proposal: { select: { shopId: true } },
      },
    });
  }

  // 예약 1건당 리뷰 1개 제한 사전 체크 - 일반적인 경우 빠르게 차단한다.
  // 동시 요청에 대한 최종 방어는 create()의 reviews_reservation_id_key unique 제약(P2002)이 맡는다.
  async existsByReservationId(reservationId: bigint): Promise<boolean> {
    const count = await getPrisma().review.count({ where: { reservationId } });
    return count > 0;
  }

  // 리뷰 생성 + 샵 평점/리뷰수 재계산을 한 트랜잭션으로 처리해 항상 일치시킨다.
  // 같은 샵에 대한 동시 리뷰 작성/수정/삭제가 서로의 재계산 결과를 덮어쓰는 경쟁 상태(lost
  // update)를 막기 위해, 리뷰를 다루기 전에 대상 샵 row를 먼저 잠가 직렬화한다
  // (reservation.repository.ts의 FOR UPDATE 패턴과 동일 - 샵은 이미 존재하는 row라 갭 락
  // 데드락 걱정 없이 바로 잠글 수 있다).
  async create(data: {
    reservationId: bigint;
    shopId: number;
    userId: number;
    rating: number;
    content: string;
  }): Promise<CreatedReviewRecord> {
    return getPrisma().$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM shops WHERE id = ${data.shopId} FOR UPDATE`;

      const review = await tx.review.create({
        data: {
          reservationId: data.reservationId,
          shopId: data.shopId,
          userId: data.userId,
          rating: data.rating,
          content: data.content,
        },
      });

      await recalculateShopRating(tx, data.shopId);

      return review;
    });
  }

  // 리뷰 수정/삭제 전 소유권 확인용 (수정/삭제 대상이 본인 리뷰인지) - IDOR 방지를 위해
  // where절에서 userId를 함께 건다.
  async findByIdForOwner(reviewId: number, userId: number): Promise<ReviewOwnerRecord | null> {
    return await getPrisma().review.findFirst({
      where: { id: reviewId, userId },
      select: { id: true, shopId: true },
    });
  }

  // 리뷰 수정 + 샵 평점 재계산을 한 트랜잭션으로 처리한다 (rating이 바뀌지 않아도 항상
  // 재계산한다 - 리뷰 개수가 적은 MVP 단계라 조건부 최적화보다 단순함을 우선한다).
  async update(
    reviewId: number,
    shopId: number,
    data: { rating?: number; content?: string },
  ): Promise<UpdatedReviewRecord> {
    return getPrisma().$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM shops WHERE id = ${shopId} FOR UPDATE`;

      const review = await tx.review.update({
        where: { id: reviewId },
        data,
      });

      await recalculateShopRating(tx, shopId);

      return review;
    });
  }

  // 리뷰 삭제 + 샵 평점/리뷰수 재계산을 한 트랜잭션으로 처리한다.
  async delete(reviewId: number, shopId: number): Promise<void> {
    await getPrisma().$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM shops WHERE id = ${shopId} FOR UPDATE`;

      await tx.review.delete({ where: { id: reviewId } });
      await recalculateShopRating(tx, shopId);
    });
  }

  async shopExists(shopId: number): Promise<boolean> {
    const shop = await getPrisma().shop.findUnique({ where: { id: shopId }, select: { id: true } });
    return shop !== null;
  }

  // 샵 리뷰 목록 조회 - 작성일(createdAt) 최신순, (createdAt, id) 커서 페이지네이션.
  async findByShopId(
    shopId: number,
    cursor: ShopReviewCursor | undefined,
    size: number,
  ): Promise<{ items: ShopReviewRecord[]; hasNext: boolean }> {
    const items = await getPrisma().review.findMany({
      where: {
        shopId,
        ...(cursor && {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        }),
      },
      select: {
        id: true,
        rating: true,
        content: true,
        createdAt: true,
        user: { select: { nickname: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: size + 1,
    });

    const hasNext = items.length > size;
    return { items: hasNext ? items.slice(0, size) : items, hasNext };
  }
}
