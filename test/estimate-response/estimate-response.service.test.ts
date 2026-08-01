import { describe, expect, it } from 'vitest';
import type { CreateSmsMessageRequest } from '../../src/estimate-response/dto/request/create-sms-message-request';
import type {
  CreatedSmsMessage,
  EstimateResponseDetail,
  EstimateResponseListRecord,
  EstimateResponseRepository,
  ProposalTimeRecord,
  SaveParsedEstimateResponseInput,
  SmsParsingContext,
} from '../../src/estimate-response/repository/estimate-response.repository';
import { EstimateResponseService } from '../../src/estimate-response/service/estimate-response.service';
import type {
  EstimateResponseParser,
  ParsedEstimateResponse,
} from '../../src/external/openai/estimate-response-parser.client';

const smsRequest: CreateSmsMessageRequest = {
  source: 'android-device-a1b2c3',
  messageId: 'android-sms-1042',
  rawPayload: {
    address: '01012345678',
    body: '견적 문자',
    receivedAt: '2026-07-18T04:20:38.000Z',
  },
};

class FakeRepository implements EstimateResponseRepository {
  savedEstimateResponse: SaveParsedEstimateResponseInput | null = null;

  async createSmsMessage(): Promise<CreatedSmsMessage> {
    return {
      id: 10,
      source: 'android-device-a1b2c3',
      messageId: 'android-sms-1042',
      direction: 'INBOUND',
      status: 'PENDING',
      requestId: null,
      shopId: null,
      createdAt: new Date('2026-07-18T04:21:00.000Z'),
    };
  }

  async findSmsParsingContext(): Promise<SmsParsingContext | null> {
    return null;
  }

  async saveParsedEstimateResponse(
    _smsMessageId: number,
    _requestId: number,
    _shopId: number,
    input: SaveParsedEstimateResponseInput,
  ): Promise<CreatedSmsMessage> {
    this.savedEstimateResponse = input;
    return {
      ...(await this.createSmsMessage()),
      requestId: 1,
      shopId: 2,
      status: 'PARSED',
    };
  }

  async updateSmsMessageStatus(
    _smsMessageId: number,
    status: 'PENDING' | 'FAILED',
  ): Promise<CreatedSmsMessage> {
    return { ...(await this.createSmsMessage()), status };
  }

  async findDetail(responseId: number): Promise<EstimateResponseDetail | null> {
    if (responseId !== 10) {
      return null;
    }

    return {
      id: 10,
      requestId: 1,
      shopId: 2,
      totalPrice: 55_000,
      basePrice: 45_000,
      removalPrice: 5_000,
      extraPrice: 5_000,
      memo: '파츠 비용 포함',
      status: 'SUBMITTED',
      createdAt: new Date('2026-07-18T04:21:00.000Z'),
      shop: {
        id: 2,
        name: '내일네일',
        phoneNumber: '01012345678',
        address: '서울시 강남구',
        addressDetail: '2층',
      },
      proposalTimes: [{ proposalDatetime: new Date('2026-07-20T05:00:00.000Z') }],
    };
  }

  async findList(): Promise<EstimateResponseListRecord[]> {
    const detail = await this.findDetail(10);

    return detail
      ? [
          {
            id: detail.id,
            totalPrice: detail.totalPrice,
            status: detail.status,
            createdAt: detail.createdAt,
            shop: {
              id: detail.shop.id,
              name: detail.shop.name,
              address: detail.shop.address,
            },
            proposalTimes: detail.proposalTimes,
          },
        ]
      : [];
  }

  async findProposalTimes(responseId: number): Promise<ProposalTimeRecord[] | null> {
    return responseId === 10
      ? [
          {
            id: 100,
            proposalDatetime: new Date('2026-07-20T05:00:00.000Z'),
            isSelected: false,
          },
        ]
      : null;
  }

  async findRequestOwner(requestId: number): Promise<{ userId: number } | null> {
    return requestId === 1 ? { userId: 1 } : null;
  }
}

class LinkedSmsRepository extends FakeRepository {
  async createSmsMessage(): Promise<CreatedSmsMessage> {
    return {
      id: 10,
      source: 'android-device-a1b2c3',
      messageId: 'android-sms-1042',
      direction: 'INBOUND',
      status: 'PENDING',
      requestId: 1,
      shopId: 2,
      createdAt: new Date('2026-07-18T04:21:00.000Z'),
    };
  }

  async findSmsParsingContext(): Promise<SmsParsingContext> {
    return {
      requestStartDate: new Date('2026-07-20T00:00:00.000Z'),
      requestEndDate: new Date('2026-07-25T00:00:00.000Z'),
      messages: [{ body: '제거 포함 55000원이에요.' }, { body: '7월 20일 오후 2시 가능해요.' }],
    };
  }
}

class FakeParser implements EstimateResponseParser {
  constructor(private readonly result: ParsedEstimateResponse) {}

  async parse(): Promise<ParsedEstimateResponse> {
    return this.result;
  }
}

describe('EstimateResponseService', () => {
  it('SMS 원본 저장 결과를 외부 응답 객체로 변환한다', async () => {
    const service = new EstimateResponseService(new FakeRepository());

    await expect(service.createSmsMessage(smsRequest)).resolves.toMatchObject({
      id: 10,
      source: 'android-device-a1b2c3',
      messageId: 'android-sms-1042',
      direction: 'INBOUND',
      status: 'PENDING',
    });
  });

  it('여러 문자에서 추출한 견적과 예약 가능 시간을 저장한다', async () => {
    const repository = new LinkedSmsRepository();
    const parser = new FakeParser({
      canProvideService: true,
      totalPrice: 55_000,
      basePrice: null,
      removalPrice: 0,
      extraPrice: 0,
      memo: '제거 포함',
      proposalDateTimes: ['2026-07-20T14:00:00+09:00'],
    });
    const service = new EstimateResponseService(repository, parser);

    await expect(service.createSmsMessage(smsRequest)).resolves.toMatchObject({
      status: 'PARSED',
    });
    expect(repository.savedEstimateResponse).toMatchObject({
      totalPrice: 55_000,
      basePrice: 55_000,
      memo: '제거 포함',
    });
    expect(repository.savedEstimateResponse?.proposalDateTimes[0]?.toISOString()).toBe(
      '2026-07-20T05:00:00.000Z',
    );
  });

  it('샵 견적 상세를 조회한다', async () => {
    const service = new EstimateResponseService(new FakeRepository());

    await expect(service.getDetail(10, 1)).resolves.toMatchObject({
      id: 10,
      shop: { name: '내일네일' },
      price: { totalPrice: 55_000 },
    });
  });

  it('견적 결과 목록을 조회한다', async () => {
    const service = new EstimateResponseService(new FakeRepository());

    await expect(service.getList(1, 1)).resolves.toMatchObject({
      requestId: 1,
      responses: [{ id: 10, totalPrice: 55_000 }],
    });
  });

  it('예약 가능 시간을 조회한다', async () => {
    const service = new EstimateResponseService(new FakeRepository());

    await expect(service.getProposalTimes(10, 1)).resolves.toMatchObject({
      estimateResponseId: 10,
      proposalTimes: [{ id: 100, isSelected: false }],
    });
  });

  it('존재하지 않는 견적 상세 조회는 404 예외를 던진다', async () => {
    const service = new EstimateResponseService(new FakeRepository());

    await expect(service.getDetail(999, 1)).rejects.toMatchObject({
      code: 'ESTIMATE_RESPONSE_NOT_FOUND',
      statusCode: 404,
    });
  });
});
