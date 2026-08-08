import { getPrisma } from '../../infra/prisma';
import type { ReservationStatus } from '../../generated/prisma/enums';

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
}

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
  // Shop.rating은 DECIMAL(2,1) 컬럼이라 소수 첫째 자리까지만 반올림해서 저장한다.
  async create(data: {
    reservationId: bigint;
    shopId: number;
    userId: number;
    rating: number;
    content: string;
  }): Promise<CreatedReviewRecord> {
    return getPrisma().$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          reservationId: data.reservationId,
          shopId: data.shopId,
          userId: data.userId,
          rating: data.rating,
          content: data.content,
        },
      });

      const aggregate = await tx.review.aggregate({
        where: { shopId: data.shopId },
        _avg: { rating: true },
        _count: { _all: true },
      });

      await tx.shop.update({
        where: { id: data.shopId },
        data: {
          rating: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
          reviewCount: aggregate._count._all,
        },
      });

      return review;
    });
  }
}
