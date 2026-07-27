import type { CreateSmsMessageRequest } from '../dto/request/create-sms-message-request';
import type { CreateSmsMessageResponse } from '../dto/response/create-sms-message-response';
import type { EstimateResponseDetailResponse } from '../dto/response/estimate-response-detail-response';
import type { EstimateResponseListResponse } from '../dto/response/estimate-response-list-response';
import type { ProposalTimeListResponse } from '../dto/response/proposal-time-list-response';
import { EstimateResponseNotFoundError, EstimateResponseForbiddenError } from '../errors/estimate-response.error';
import type { EstimateResponseRepository } from '../repository/estimate-response.repository';

export class EstimateResponseService {
  constructor(private readonly repository: EstimateResponseRepository) {}

  async createSmsMessage(request: CreateSmsMessageRequest): Promise<CreateSmsMessageResponse> {
    const message = await this.repository.createSmsMessage(request);

    // TODO: [eun] SMS 원문에서 가격, 메모, 예약 가능 시간을 파싱한다.
    // TODO: [eun] 파싱 결과로 EstimateResponse와 ShopProposalTime을 트랜잭션으로 생성한다.
    // TODO: [eun] 처리 결과에 따라 SmsMessage를 PARSED 또는 FAILED로 변경하고 실패 사유를 저장한다.

    return {
      id: message.id,
      source: message.source,
      messageId: message.messageId,
      direction: 'INBOUND',
      status: message.status,
      createdAt: message.createdAt.toISOString(),
    };
  }

  async getDetail(responseId: number, userId: number): Promise<EstimateResponseDetailResponse> {
    const response = await this.repository.findDetail(responseId);

    if (!response) {
      throw new EstimateResponseNotFoundError({ responseId });
    }

    // 해당 견적 응답이 속한 견적 요청의 소유자인지 확인
    const owner = await this.repository.findRequestOwner(response.requestId);
    if (!owner || owner.userId !== userId) {
      throw new EstimateResponseForbiddenError();
    }

    return {
      id: response.id,
      requestId: response.requestId,
      shop: response.shop,
      price: {
        totalPrice: response.totalPrice,
        basePrice: response.basePrice,
        removalPrice: response.removalPrice,
        extraPrice: response.extraPrice,
      },
      memo: response.memo,
      status: response.status,
      proposalDateTimes: response.proposalTimes.map(({ proposalDatetime }) =>
        proposalDatetime.toISOString(),
      ),
      createdAt: response.createdAt.toISOString(),
    };
  }

  async getList(requestId: number, userId: number): Promise<EstimateResponseListResponse> {
    // 견적 요청 존재 여부 확인
    const request = await this.repository.findRequestOwner(requestId);
    if (!request) {
      throw new EstimateResponseNotFoundError({ requestId });
    }

    // 본인 견적인지 확인 - 다른 사람의 견적 결과는 조회 불가
    if (request.userId !== userId) {
      throw new EstimateResponseForbiddenError();
    }

    const responses = await this.repository.findList(requestId);

    return {
      requestId,
      responses: responses.map((response) => ({
        id: response.id,
        shop: response.shop,
        totalPrice: response.totalPrice,
        status: response.status,
        proposalDateTimes: response.proposalTimes.map(({ proposalDatetime }) =>
          proposalDatetime.toISOString(),
        ),
        createdAt: response.createdAt.toISOString(),
      })),
    };
  }

  async getProposalTimes(responseId: number, userId: number): Promise<ProposalTimeListResponse> {
    const proposalTimes = await this.repository.findProposalTimes(responseId);

    if (!proposalTimes) {
      throw new EstimateResponseNotFoundError({ responseId });
    }

    // 해당 견적 응답이 속한 견적 요청의 소유자인지 확인
    const detail = await this.repository.findDetail(responseId);
    if (!detail) {
      throw new EstimateResponseNotFoundError({ responseId });
    }
    const owner = await this.repository.findRequestOwner(detail.requestId);
    if (!owner || owner.userId !== userId) {
      throw new EstimateResponseForbiddenError();
    }

    return {
      estimateResponseId: responseId,
      proposalTimes: proposalTimes.map((proposalTime) => ({
        id: proposalTime.id,
        proposalDateTime: proposalTime.proposalDatetime.toISOString(),
        isSelected: proposalTime.isSelected,
      })),
    };
  }
}
