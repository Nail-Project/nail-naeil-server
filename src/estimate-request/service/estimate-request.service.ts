import { EstimateRequestRepository } from '../repository/estimate-request.repository';
import { CreateEstimateRequestDto } from '../dto/request/create-estimate-request.dto';
import { CreateEstimateResponseDto } from '../dto/response/create-estimate-response.dto';
import { GetEstimatesResponseDto } from '../dto/response/get-estimates-response.dto';
import { EstimateRequestFailedError, InternalServerError } from '../../common/errors/common.error';

export class EstimateRequestService {
  private readonly repository = new EstimateRequestRepository();

  // 견적 요청 생성
  // repository에서 받은 Prisma 모델을 Response DTO로 변환해 반환한다.
  async createEstimateRequest(dto: CreateEstimateRequestDto): Promise<CreateEstimateResponseDto> {
    try {
      const result = await this.repository.create(dto);

      return {
        estimateId: result.id,
        nailType: result.nailType,
        removalType: result.removalType,
        startDate: result.startDate,
        endDate: result.endDate,
        preferredTime: result.preferredTime,
        recommendType: result.recommendType,
        description: result.description ?? null,
        status: result.status,
        images: result.images.map((img) => ({
          imageId: img.id,
          imageUrl: img.imageUrl,
        })),
        createdAt: result.createdAt,
      };
    } catch {
      throw new EstimateRequestFailedError();
    }
  }

  // 상태별 견적 요청 목록 조회
  // 각 요청에 달린 proposals를 집계해 카드에 필요한 통계값을 계산한다.
  async getEstimatesByStatus(
    status: 'MATCHING' | 'COMPLETED' | 'EXPIRED' | 'ALL',
  ): Promise<GetEstimatesResponseDto[]> {
    try {
      const estimates = await this.repository.findByStatus(status);

      return estimates.map((estimate) => {
        const proposals = estimate.proposals;

        // 전체 견적 응답(샵 제안) 수
        const proposalCount = proposals.length;

        // SUBMITTED: 샵에서 견적을 제출했지만 사용자가 아직 수락/거절하지 않은 상태
        // 팀원 EstimateResponseStatus 기준 → SUBMITTED가 대기 상태
        const submittedShopCount = proposals.filter((p) => p.status === 'SUBMITTED').length;

        // 도착한 견적 중 최저 총금액 (견적 응답이 없으면 null)
        const prices = proposals
          .map((p) => p.totalPrice)
          .filter((price): price is number => price !== null);
        const minPrice = prices.length > 0 ? Math.min(...prices) : null;

        return {
          estimateId: estimate.id,
          thumbnailUrl: estimate.images[0]?.imageUrl ?? null,
          nailType: estimate.nailType,
          createdAt: estimate.createdAt,
          status: estimate.status,
          proposalCount,
          submittedShopCount,
          minPrice,
        };
      });
    } catch {
      throw new InternalServerError();
    }
  }
}
