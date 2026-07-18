import type { CreateSmsMessageRequest } from '../dto/request/create-sms-message-request';
import type { CreateSmsMessageResponse } from '../dto/response/create-sms-message-response';
import type { EstimateResponseDetailResponse } from '../dto/response/estimate-response-detail-response';
import type { EstimateResponseListResponse } from '../dto/response/estimate-response-list-response';
import type { ProposalTimeListResponse } from '../dto/response/proposal-time-list-response';
import { EstimateResponseNotFoundError } from '../errors/estimate-response.error';
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

  async getDetail(responseId: number): Promise<EstimateResponseDetailResponse> {
    const response = await this.repository.findDetail(responseId);

    if (!response) {
      throw new EstimateResponseNotFoundError({ responseId });
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

  async getList(requestId: number): Promise<EstimateResponseListResponse> {
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

  async getProposalTimes(responseId: number): Promise<ProposalTimeListResponse> {
    const proposalTimes = await this.repository.findProposalTimes(responseId);

    if (!proposalTimes) {
      throw new EstimateResponseNotFoundError({ responseId });
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
