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
import { NotificationService } from '../../notification/service/notification.service';
import type { EstimateResultSort } from '../dto/request/get-estimate-results-request';

export class EstimateResponseService {
  private readonly processingSmsMessageIds = new Set<number>();

  constructor(
    private readonly repository: EstimateResponseRepository,
    private readonly parser: EstimateResponseParser = new OpenAiEstimateResponseParser(),
    private readonly notificationService = new NotificationService(),
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
        parsed.canProvideService &&
        (parsed.totalPrice === null || proposalDateTimes.length === 0)
      ) {
        await this.repository.updateSmsMessageStatus(
          message.id,
          'PENDING',
          '가격과 예약 가능 시간이 모두 확인될 때까지 추가 답장을 기다립니다.',
        );
        return;
      }

      // 저장 전, 이 요청의 기존 최저가를 구해 이번 응답이 더 낮은지(더 낮은 견적 도착) 판단한다.
      const priorLowestPrice = await this.repository.findLowestOfferedPrice(message.requestId);

      await this.repository.saveParsedEstimateResponse(
        message.id,
        message.requestId,
        message.shopId,
        {
          canProvideService: parsed.canProvideService,
          estimatedDurationMinutes: parsed.estimatedDurationMinutes,
          isRemovalIncluded: parsed.isRemovalIncluded,
          totalPrice: parsed.totalPrice,
          basePrice: parsed.basePrice,
          removalPrice: parsed.removalPrice,
          designExtraPrice: parsed.designExtraPrice,
          optionExtraPrice: parsed.optionExtraPrice,
          memo: parsed.memo,
          proposalDateTimes,
        },
      );

      // 견적 응답이 저장되면 요청자에게 알림. 알림 실패가 파싱 플로우를 막지 않도록 격리한다.
      // 이전 최저가보다 낮은 견적이면 "더 낮은 견적 도착", 아니면 일반 "견적 답변 도착"으로 보낸다.
      try {
        const owner = await this.repository.findRequestOwner(message.requestId);
        if (owner) {
          const isNewLowest =
            parsed.totalPrice !== null &&
            priorLowestPrice !== null &&
            parsed.totalPrice < priorLowestPrice;

          await this.notificationService.notify(
            isNewLowest
              ? {
                  userId: owner.userId,
                  type: 'LOWER_ESTIMATE',
                  title: '더 저렴한 견적이 도착했어요',
                  body: '지금까지보다 더 낮은 견적이 도착했어요.',
                  data: { estimateRequestId: message.requestId },
                }
              : {
                  userId: owner.userId,
                  type: 'ESTIMATE_RESPONSE',
                  title: '견적 답변이 도착했어요',
                  body: '요청하신 견적에 새 답변이 도착했어요.',
                  data: { estimateRequestId: message.requestId },
                },
          );
        }
      } catch (notifyError) {
        console.error('[EstimateResponseService] 알림 생성 실패', {
          smsMessageId: message.id,
          errorType: notifyError instanceof Error ? notifyError.name : typeof notifyError,
        });
      }
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
      shop: {
        ...response.shop,
        latitude: response.shop.latitude.toNumber(),
        longitude: response.shop.longitude.toNumber(),
        rating: response.shop.rating.toNumber(),
      },
      price: {
        totalPrice: response.totalPrice,
        basePrice: response.basePrice,
        removalPrice: response.removalPrice,
        designExtraPrice: response.designExtraPrice,
        optionExtraPrice: response.optionExtraPrice,
      },
      memo: response.memo,
      estimatedDurationMinutes: response.estimatedDurationMinutes,
      canProvideService: response.canProvideService,
      isRemovalIncluded: response.isRemovalIncluded,
      status: response.status,
      proposalDateTimes: response.proposalTimes.map(({ proposalDatetime }) =>
        proposalDatetime.toISOString(),
      ),
      createdAt: response.createdAt.toISOString(),
    };
  }

  async getList(
    requestId: number,
    userId: number,
    sort: EstimateResultSort = 'RECOMMENDED',
  ): Promise<EstimateResponseListResponse> {
    // 견적 요청 존재 여부 확인
    const request = await this.repository.findRequestOwner(requestId);
    if (!request) {
      throw new EstimateResponseNotFoundError({ requestId });
    }

    // 본인 견적인지 확인 - 다른 사람의 견적 결과는 조회 불가
    if (request.userId !== userId) {
      throw new EstimateResponseForbiddenError();
    }

    const context = await this.repository.findRequestContext(requestId);
    const responses = await this.repository.findList(requestId);
    const comparablePrices = responses
      .filter(({ canProvideService, totalPrice }) => canProvideService && totalPrice !== null)
      .map(({ totalPrice }) => totalPrice as number);
    const minPrice = comparablePrices.length ? Math.min(...comparablePrices) : null;
    const respondedShopIds = new Set(responses.map(({ shop }) => shop.id));
    const waiting = (context?.targetShops ?? []).filter(
      ({ shop }) => !respondedShopIds.has(shop.id),
    );
    const averages = await this.repository.findAverageResponseMinutes(
      waiting.map(({ shop }) => shop.id),
    );

    const items = responses.map((response) => {
      const distanceMeters =
        context?.latitude && context.longitude
          ? this.calculateDistanceMeters(
              context.latitude.toNumber(),
              context.longitude.toNumber(),
              response.shop.latitude.toNumber(),
              response.shop.longitude.toNumber(),
            )
          : null;
      return {
        id: response.id,
        shop: {
          id: response.shop.id,
          name: response.shop.name,
          address: response.shop.address,
          latitude: response.shop.latitude.toNumber(),
          longitude: response.shop.longitude.toNumber(),
          rating: response.shop.rating.toNumber(),
          reviewCount: response.shop.reviewCount,
        },
        totalPrice: response.totalPrice,
        distanceMeters,
        isLowestPrice:
          response.canProvideService &&
          response.totalPrice !== null &&
          response.totalPrice === minPrice,
        isRemovalIncluded: response.isRemovalIncluded,
        removalPrice: response.removalPrice,
        estimatedDurationMinutes: response.estimatedDurationMinutes,
        canProvideService: response.canProvideService,
        status: response.status,
        proposalDateTimes: response.proposalTimes.map(({ proposalDatetime }) =>
          proposalDatetime.toISOString(),
        ),
        createdAt: response.createdAt.toISOString(),
      };
    });
    this.sortResults(items, sort);

    return {
      requestId,
      responses: items,
      waitingShops: waiting.map(({ shop }) => {
        const averageResponseMinutes = averages.get(shop.id) ?? 60;
        return {
          shopId: shop.id,
          name: shop.name,
          averageResponseMinutes,
          expectedResponseMinutes: averageResponseMinutes,
        };
      }),
    };
  }

  private sortResults(
    items: EstimateResponseListResponse['responses'],
    sort: EstimateResultSort,
  ): void {
    const earliest = (item: EstimateResponseListResponse['responses'][number]) =>
      item.proposalDateTimes[0]
        ? new Date(item.proposalDateTimes[0]).getTime()
        : Number.MAX_SAFE_INTEGER;
    items.sort((a, b) => {
      if (sort === 'LOWEST_PRICE') return this.compareNullablePrices(a, b) || a.id - b.id;
      if (sort === 'NEAREST')
        return (
          (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
            (b.distanceMeters ?? Number.MAX_SAFE_INTEGER) || a.id - b.id
        );
      if (sort === 'EARLIEST_AVAILABLE') return earliest(a) - earliest(b) || a.id - b.id;
      const scoreA = this.recommendationScore(a);
      const scoreB = this.recommendationScore(b);
      return scoreB - scoreA || a.id - b.id;
    });
  }

  private compareNullablePrices(
    a: EstimateResponseListResponse['responses'][number],
    b: EstimateResponseListResponse['responses'][number],
  ): number {
    const priceA = a.canProvideService ? a.totalPrice : null;
    const priceB = b.canProvideService ? b.totalPrice : null;
    if (priceA === null) return priceB === null ? 0 : 1;
    if (priceB === null) return -1;
    return priceA - priceB;
  }

  private recommendationScore(item: EstimateResponseListResponse['responses'][number]): number {
    if (!item.canProvideService || item.totalPrice === null) return Number.NEGATIVE_INFINITY;
    return (
      item.shop.rating * 20 - item.totalPrice / 10_000 - (item.distanceMeters ?? 10_000) / 1_000
    );
  }

  private calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (degrees: number) => (degrees * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return Math.round(6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
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
