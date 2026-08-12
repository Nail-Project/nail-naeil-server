import { getPrisma } from '../../infra/prisma';
import { Prisma } from '../../generated/prisma/client';

export interface CompletedReservationRecord {
  id: bigint;
}

export interface ShopReviewRecord {
  id: number;
  shopId: number;
  rating: number;
  content: string | null;
  createdAt: Date;
}

export interface UpdatedShopReviewRecord {
  id: number;
  shopId: number;
  rating: number;
  content: string | null;
  updatedAt: Date;
}

export interface ReviewOwnerRecord {
  id: number;
  shopId: number;
}

export interface ReviewRepository {
  // 해당 샵에서 시술이 완료된 본인 예약이 있는지 확인 (리뷰 작성 자격)
  findCompletedReservationForShop(
    shopId: number,
    userId: number,
  ): Promise<CompletedReservationRecord | null>;
  existsByShopAndUser(shopId: number, userId: number): Promise<boolean>;
  create(data: {
    shopId: number;
    userId: number;
    rating: number;
    content?: string;
  }): Promise<ShopReviewRecord>;
  findByIdForOwner(reviewId: number, userId: number): Promise<ReviewOwnerRecord | null>;
  update(
    reviewId: number,
    shopId: number,
    data: { rating?: number; content?: string },
  ): Promise<UpdatedShopReviewRecord>;
  delete(reviewId: number, shopId: number): Promise<void>;
}

// 리뷰 생성/수정/삭제 시 샵 평점/리뷰수를 항상 최신 상태로 재계산한다.
// Shop.rating은 DECIMAL(2,1) 컬럼이라 소수 첫째 자리까지만 반올림해서 저장한다.
const recalculateShopRating = async (
  tx: Prisma.TransactionClient,
  shopId: number,
): Promise<void> => {
  const aggregate = await tx.shopReview.aggregate({
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
  async findCompletedReservationForShop(
    shopId: number,
    userId: number,
  ): Promise<CompletedReservationRecord | null> {
    return await getPrisma().reservation.findFirst({
      where: { userId, status: 'COMPLETED', proposal: { shopId } },
      select: { id: true },
    });
  }

  // 샵 1곳당 리뷰 1개 제한 사전 체크 - 일반적인 경우 빠르게 차단한다.
  // 동시 요청에 대한 최종 방어는 create()의 shop_reviews_shop_id_user_id_key unique 제약(P2002)이 맡는다.
  async existsByShopAndUser(shopId: number, userId: number): Promise<boolean> {
    const count = await getPrisma().shopReview.count({ where: { shopId, userId } });
    return count > 0;
  }

  // 리뷰 생성 + 샵 평점/리뷰수 재계산을 한 트랜잭션으로 처리해 항상 일치시킨다.
  // 같은 샵에 대한 동시 리뷰 작성/수정/삭제가 서로의 재계산 결과를 덮어쓰는 경쟁 상태(lost
  // update)를 막기 위해, 리뷰를 다루기 전에 대상 샵 row를 먼저 잠가 직렬화한다
  // (reservation.repository.ts의 FOR UPDATE 패턴과 동일 - 샵은 이미 존재하는 row라 갭 락
  // 데드락 걱정 없이 바로 잠글 수 있다).
  async create(data: {
    shopId: number;
    userId: number;
    rating: number;
    content?: string;
  }): Promise<ShopReviewRecord> {
    return getPrisma().$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM shops WHERE id = ${data.shopId} FOR UPDATE`;

      const review = await tx.shopReview.create({
        data: {
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
    return await getPrisma().shopReview.findFirst({
      where: { id: reviewId, userId },
      select: { id: true, shopId: true },
    });
  }

  async update(
    reviewId: number,
    shopId: number,
    data: { rating?: number; content?: string },
  ): Promise<UpdatedShopReviewRecord> {
    return getPrisma().$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM shops WHERE id = ${shopId} FOR UPDATE`;

      const review = await tx.shopReview.update({
        where: { id: reviewId },
        data,
      });

      await recalculateShopRating(tx, shopId);

      return review;
    });
  }

  async delete(reviewId: number, shopId: number): Promise<void> {
    await getPrisma().$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM shops WHERE id = ${shopId} FOR UPDATE`;

      await tx.shopReview.delete({ where: { id: reviewId } });
      await recalculateShopRating(tx, shopId);
    });
  }
}
