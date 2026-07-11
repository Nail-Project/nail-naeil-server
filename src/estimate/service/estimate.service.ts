import { EstimateRepository } from '../repository/estimate.repository';
import { CreateEstimateRequestType } from '../dto/create-estimate-request';
import { CreateEstimateResponse } from '../dto/create-estimate-response';
import { GetEstimatesResponse } from '../dto/get-estimates-response';
import { EstimateRequestFailedError, InternalServerError } from '../../common/errors/common.error';
import { EstimateNotFoundError } from '../error/estimate.error';
import { ResultEstimateResponse } from '../dto/result-estimate-response';
import { ProposalTimeResponse } from '../dto/proposal-time-response';
import { ProposalDetailResponse } from '../dto/proposal-detail-response';

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

  // 견적 결과 상세 조회
  async getEstimateResult(requestId: bigint): Promise<ResultEstimateResponse> {
    try {
      const data = await this.estimateRepository.findResultByRequestId(requestId);

      // 존재하지 않는 견적 요청 id인 경우 404
      if (!data) {
        throw new EstimateNotFoundError();
      }

      // TODO: 로그인 구현 후 data.userId와 현재 로그인한 userId 비교
      //       일치하지 않으면 EstimateForbiddenError (403) throw

      return {
        requestId: Number(data.id),
        proposals: data.proposals.map((proposal) => ({
          proposalId: Number(proposal.id),
          shopId: proposal.shopId,
          shopName: proposal.shop.name,
          // TODO: Shop 테이블에 rating, reviewCount, distance 컬럼 추가 후 연결 예정
          rating: null,
          reviewCount: null,
          distance: null,
          totalPrice: proposal.totalPrice,
          // removalPrice가 존재하면 제거 비용 포함으로 판단
          isRemovalIncluded: proposal.removalPrice !== null,
          basePrice: proposal.basePrice,
          removalPrice: proposal.removalPrice,
          extraPrice: proposal.extraPrice,
          memo: proposal.memo,
          status: proposal.status,
          times: proposal.times.map((time) => ({
            timeId: Number(time.id),
            proposalDatetime: time.proposalDatetime,
            isSelected: time.isSelected,
          })),
        })),
      };
    } catch (error) {
      // EstimateNotFoundError는 그대로 전달 (404)
      if (error instanceof EstimateNotFoundError) throw error;
      throw new EstimateRequestFailedError();
    }
  }

  // 샵 견적별 예약 가능 시간 조회
  async getProposalTimes(proposalId: bigint): Promise<ProposalTimeResponse> {
    try {
      const data = await this.estimateRepository.findTimesByProposalId(proposalId);

      // 존재하지 않는 견적 제안 id인 경우 404
      if (!data) {
        throw new EstimateNotFoundError();
      }

      return {
        proposalId: Number(data.id),
        times: data.times.map((time) => ({
          timeId: Number(time.id),
          proposalDatetime: time.proposalDatetime,
          isSelected: time.isSelected,
        })),
      };
    } catch (error) {
      // EstimateNotFoundError는 그대로 전달 (404)
      if (error instanceof EstimateNotFoundError) throw error;
      throw new EstimateRequestFailedError();
    }
  }

  // 샵 견적 상세 조회
  async getProposalDetail(proposalId: bigint): Promise<ProposalDetailResponse> {
    try {
      const data = await this.estimateRepository.findProposalDetailById(proposalId);

      // 존재하지 않는 견적 제안 id인 경우 404
      if (!data) throw new EstimateNotFoundError();

      return {
        proposalId: Number(data.id),
        shopName: data.shop.name,
        // TODO: Shop 테이블에 rating, reviewCount 컬럼 추가 후 연결 예정
        rating: null,
        reviewCount: null,
        totalPrice: data.totalPrice,
        basePrice: data.basePrice,
        removalPrice: data.removalPrice,
        extraPrice: data.extraPrice,
        memo: data.memo,
        times: data.times.map((time) => ({
          timeId: Number(time.id),
          proposalDatetime: time.proposalDatetime,
          isSelected: time.isSelected,
        })),
        designImages: data.request.images.map((img) => ({
          imageId: Number(img.id),
          imageUrl: img.imageUrl,
        })),
        address: data.shop.address,
        locationGuide: data.shop.locationGuide,
        parkingInfo: data.shop.parkingInfo,
      };
    } catch (error) {
      // EstimateNotFoundError는 그대로 전달 (404)
      if (error instanceof EstimateNotFoundError) throw error;
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
