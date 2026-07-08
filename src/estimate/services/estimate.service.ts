import { estimateRepository } from '../repositories/estimate.repository';
import { CreateEstimateRequestType } from '../dtos/estimate.dto';

export const estimateService = {
  // 견적 요청 생성
  createEstimate: async (dto: CreateEstimateRequestType) => {
    return await estimateRepository.create(dto);
  },

  // 상태별 견적 목록 조회 및 응답 데이터 가공
  getEstimatesByStatus: async (status: 'MATCHING' | 'COMPLETED' | 'EXPIRED' | 'ALL') => {
    const estimates = await estimateRepository.findByStatus(status);

    return estimates.map((estimate) => {
      const proposals = estimate.proposals;

      // 견적 응답 중 PENDING 상태인 샵 수
      const pendingShopCount = proposals.filter((p) => p.status === 'PENDING').length;

      // 전체 견적 응답 수
      const proposalCount = proposals.length;

      // 최저가 (견적 응답이 없으면 null)
      const prices = proposals
        .map((p) => p.totalPrice)
        .filter((price): price is number => price !== null);
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;

      return {
        estimateId: Number(estimate.id),
        thumbnailUrl: estimate.images[0]?.imageUrl ?? null,
        nailType: estimate.nailType,
        createdAt: estimate.createdAt,
        status: estimate.status,
        proposalCount,
        pendingShopCount,
        minPrice,
      };
    });
  },
};
