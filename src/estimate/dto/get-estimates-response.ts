export interface GetEstimatesResponse {
  estimateId: number;
  thumbnailUrl: string | null;
  nailType: string;
  createdAt: Date;
  status: string;
  proposalCount: number;
  pendingShopCount: number;
  minPrice: number | null;
}
