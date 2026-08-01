import type { CreateSmsMessageRequest } from '../dto/request/create-sms-message-request';
import type { CreateSmsMessageResponse } from '../dto/response/create-sms-message-response';
import type { EstimateResponseDetailResponse } from '../dto/response/estimate-response-detail-response';
import type { EstimateResponseListResponse } from '../dto/response/estimate-response-list-response';
import type { ProposalTimeListResponse } from '../dto/response/proposal-time-list-response';
import {
  OpenAiEstimateResponseParser,
  type EstimateResponseParser,
} from '../../external/openai/estimate-response-parser.client';
import {
  EstimateResponseNotFoundError,
  EstimateResponseForbiddenError,
} from '../errors/estimate-response.error';
import type { EstimateResponseRepository } from '../repository/estimate-response.repository';

export class EstimateResponseService {
  private readonly processingSmsMessageIds = new Set<number>();

  constructor(
    private readonly repository: EstimateResponseRepository,
    private readonly parser: EstimateResponseParser = new OpenAiEstimateResponseParser(),
  ) {}

  async createSmsMessage(request: CreateSmsMessageRequest): Promise<CreateSmsMessageResponse> {
    const message = await this.repository.createSmsMessage(request);

    if (message.requestId && message.shopId && message.status === 'PENDING') {
      this.dispatchSmsParsing(message, request.rawPayload.receivedAt);
    }

    return {
      id: message.id,
      source: message.source,
      messageId: message.messageId,
      direction: 'INBOUND',
      status: message.status,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private dispatchSmsParsing(
    message: Awaited<ReturnType<EstimateResponseRepository['createSmsMessage']>>,
    receivedAt: string,
  ): void {
    if (this.processingSmsMessageIds.has(message.id)) {
      return;
    }

    this.processingSmsMessageIds.add(message.id);
    void this.processSmsMessage(message, receivedAt)
      .catch((error) => {
        console.error('[EstimateResponseService] 문자 견적 상태 변경 실패', {
          smsMessageId: message.id,
          errorType: error instanceof Error ? error.name : typeof error,
        });
      })
      .finally(() => {
        this.processingSmsMessageIds.delete(message.id);
      });
  }

  private async processSmsMessage(
    message: Awaited<ReturnType<EstimateResponseRepository['createSmsMessage']>>,
    receivedAt: string,
  ): Promise<void> {
    if (!message.requestId || !message.shopId) {
      return;
    }

    try {
      const context = await this.repository.findSmsParsingContext(
        message.requestId,
        message.shopId,
      );

      if (!context) {
        await this.repository.updateSmsMessageStatus(
          message.id,
          'FAILED',
          '견적 요청 정보를 찾을 수 없습니다.',
        );
        return;
      }

      const parsed = await this.parser.parse({
        messages: context.messages.map((payload) => this.readSmsBody(payload)).filter(Boolean),
        receivedAt,
        requestStartDate: this.formatSeoulDate(context.requestStartDate),
        requestEndDate: this.formatSeoulDate(context.requestEndDate),
      });
      const proposalDateTimes = this.filterProposalDateTimes(
        parsed.proposalDateTimes,
        context.requestStartDate,
        context.requestEndDate,
      );

      if (
        !parsed.canProvideService ||
        parsed.totalPrice === null ||
        proposalDateTimes.length === 0
      ) {
        await this.repository.updateSmsMessageStatus(
          message.id,
          'PENDING',
          '가격과 예약 가능 시간이 모두 확인될 때까지 추가 답장을 기다립니다.',
        );
        return;
      }

      await this.repository.saveParsedEstimateResponse(
        message.id,
        message.requestId,
        message.shopId,
        {
          totalPrice: parsed.totalPrice,
          basePrice: parsed.basePrice ?? parsed.totalPrice,
          removalPrice: parsed.removalPrice,
          extraPrice: parsed.extraPrice,
          memo: parsed.memo,
          proposalDateTimes,
        },
      );
    } catch (error) {
      console.error('[EstimateResponseService] 문자 견적 분석 실패', {
        smsMessageId: message.id,
        errorType: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      await this.repository.updateSmsMessageStatus(
        message.id,
        'FAILED',
        '문자 견적 분석에 실패했습니다.',
      );
    }
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

  private readSmsBody(rawPayload: unknown): string {
    if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
      return '';
    }

    const payload = rawPayload as Record<string, unknown>;

    return typeof payload.body === 'string' ? payload.body : '';
  }

  private filterProposalDateTimes(
    dateTimes: string[],
    requestStartDate: Date,
    requestEndDate: Date,
  ): Date[] {
    const startDate = this.formatSeoulDate(requestStartDate);
    const endDate = this.formatSeoulDate(requestEndDate);
    const uniqueTimes = new Map<number, Date>();

    for (const value of dateTimes) {
      const dateTime = new Date(value);
      if (Number.isNaN(dateTime.getTime())) {
        continue;
      }

      const proposalDate = this.formatSeoulDate(dateTime);

      if (proposalDate >= startDate && proposalDate <= endDate) {
        uniqueTimes.set(dateTime.getTime(), dateTime);
      }
    }

    return [...uniqueTimes.values()].sort((a, b) => a.getTime() - b.getTime());
  }

  private formatSeoulDate(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }
}
