import type { MatchShopRequest, SupportedRecommendType } from '../dto/request/match-shop-request';
import type { MatchedShopResponse } from '../dto/response/matched-shop-response';
import { InvalidShopLocationError } from '../errors/shop.error';
import type { ShopMatchingRepository } from '../repository/shop-matching.repository';

interface ShopMatchingPolicy {
  radiusMeters: number;
  limit: number;
}

export const SHOP_MATCHING_POLICIES: Record<SupportedRecommendType, ShopMatchingPolicy> = {
  CLOSE: {
    radiusMeters: 2_000,
    limit: 5,
  },
  BALANCED: {
    radiusMeters: 5_000,
    limit: 8,
  },
  WIDE: {
    radiusMeters: 10_000,
    limit: 10,
  },
  CHEAP: {
    radiusMeters: 10_000,
    limit: 10,
  },
};

export class ShopMatchingService {
  constructor(private readonly repository: ShopMatchingRepository) {}

  async match(request: MatchShopRequest): Promise<MatchedShopResponse[]> {
    this.validateLocation(request.latitude, request.longitude);

    const policy = SHOP_MATCHING_POLICIES[request.recommendType];
    if (request.recommendType === 'CHEAP') {
      return this.repository.findCheapShops(
        request.latitude,
        request.longitude,
        policy.radiusMeters,
        policy.limit,
      );
    }
    return this.repository.findNearbyShops(
      request.latitude,
      request.longitude,
      policy.radiusMeters,
      policy.limit,
    );
  }

  private validateLocation(latitude: number, longitude: number): void {
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new InvalidShopLocationError();
    }
  }
}
