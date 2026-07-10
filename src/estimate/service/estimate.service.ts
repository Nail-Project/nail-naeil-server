import { EstimateRepository } from '../repository/estimate.repository';
import { CreateEstimateRequestType } from '../dto/create-estimate-request';
import { CreateEstimateResponse } from '../dto/create-estimate-response';
import { GetEstimatesResponse } from '../dto/get-estimates-response';
import { EstimateRequestFailedError, InternalServerError } from '../../common/errors/common.error';

export class EstimateService {
  private readonly estimateRepository = new EstimateRepository();

  // 견적 요청 생성
  async createEstimate(dto: CreateEstimateRequestType): Promise<CreateEstimateResponse> {
    try {
      const result = await this.estimateRepository.create(dto);

      return {
        estimateId: Number(result.id),
        nailType: result.nailType,
        removalType: result.removalType,
        startDate: result.startDate,
        endDate: result.endDate,
        preferredTime: result.preferredTime,
        recommendType: result.recommendType,
        description: result.description ?? null,
        status: result.status,
        images: result.images.map((img) => ({
          imageId: Number(img.id),
          imageUrl: img.imageUrl,
        })),
        createdAt: result.createdAt,
      };
    } catch {
      throw new EstimateRequestFailedError();
    }
  }

  // 상태별 견적 목록 조회 및 응답 데이터 가공
  async getEstimatesByStatus(status: 'MATCHING' | 'COMPLETED' | 'EXPIRED' | 'ALL'): Promise<GetEstimatesResponse[]> {
    try {
      const estimates = await this.estimateRepository.findByStatus(status);

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
    } catch {
      throw new InternalServerError();
    }
  }
}
