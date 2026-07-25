export type SupportedRecommendType = 'CLOSE' | 'BALANCED' | 'WIDE';
export type RecommendType = SupportedRecommendType | 'CHEAP';

export interface MatchShopRequest {
  latitude: number;
  longitude: number;
  recommendType: RecommendType;
}
