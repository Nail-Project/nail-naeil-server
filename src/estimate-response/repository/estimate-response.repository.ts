import { getPrisma } from '../../infra/prisma';
import type { Prisma } from '../../generated/prisma/client';
import type { CreateSmsMessageRequest } from '../dto/request/create-sms-message-request';

export interface CreatedSmsMessage {
  id: number;
  source: string;
  messageId: string;
  direction: 'OUTBOUND' | 'INBOUND';
  status: 'PENDING' | 'SENT' | 'PARSED' | 'FAILED';
  requestId: number | null;
  shopId: number | null;
  createdAt: Date;
}

export interface SmsParsingContext {
  requestStartDate: Date;
  requestEndDate: Date;
  messages: Prisma.JsonValue[];
}

export interface SaveParsedEstimateResponseInput {
  canProvideService: boolean;
  estimatedDurationMinutes: number;
  isRemovalIncluded: boolean;
  totalPrice: number | null;
  basePrice: number | null;
  removalPrice: number | null;
  extraPrice: number | null;
  memo: string | null;
  proposalDateTimes: Date[];
}

export interface EstimateResponseDetail {
  id: number;
  requestId: number;
  shopId: number;
  totalPrice: number | null;
  basePrice: number | null;
  removalPrice: number | null;
  extraPrice: number | null;
  estimatedDurationMinutes: number;
  canProvideService: boolean;
  isRemovalIncluded: boolean;
  memo: string | null;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
  shop: {
    id: number;
    name: string;
    phoneNumber: string | null;
    address: string;
    addressDetail: string | null;
    latitude: { toNumber(): number };
    longitude: { toNumber(): number };
    rating: { toNumber(): number };
    reviewCount: number;
    businessHours: Prisma.JsonValue | null;
    closedDays: Prisma.JsonValue | null;
  };
  proposalTimes: { proposalDatetime: Date }[];
}

export interface EstimateResponseListRecord {
  id: number;
  totalPrice: number | null;
  removalPrice: number | null;
  estimatedDurationMinutes: number;
  canProvideService: boolean;
  isRemovalIncluded: boolean;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
  shop: {
    id: number;
    name: string;
    address: string;
    latitude: { toNumber(): number };
    longitude: { toNumber(): number };
    rating: { toNumber(): number };
    reviewCount: number;
  };
  proposalTimes: { proposalDatetime: Date }[];
}

export interface ProposalTimeRecord {
  id: number;
  proposalDatetime: Date;
  isSelected: boolean;
}

export interface EstimateResponseRepository {
  createSmsMessage(request: CreateSmsMessageRequest): Promise<CreatedSmsMessage>;
  findRequestOwner(requestId: number): Promise<{ userId: number } | null>;
  findLowestSubmittedPrice(requestId: number): Promise<number | null>;
  findDetail(responseId: number): Promise<EstimateResponseDetail | null>;
  findList(requestId: number): Promise<EstimateResponseListRecord[]>;
  findRequestContext(requestId: number): Promise<EstimateRequestContext | null>;
  findAverageResponseMinutes(shopIds: number[]): Promise<Map<number, number>>;
  findSmsParsingContext(requestId: number, shopId: number): Promise<SmsParsingContext | null>;
  saveParsedEstimateResponse(
    smsMessageId: number,
    requestId: number,
    shopId: number,
    input: SaveParsedEstimateResponseInput,
  ): Promise<CreatedSmsMessage>;
  updateSmsMessageStatus(
    smsMessageId: number,
    status: 'PENDING' | 'FAILED',
    errorMessage: string | null,
  ): Promise<CreatedSmsMessage>;
  findProposalTimes(responseId: number): Promise<ProposalTimeRecord[] | null>;
}

export interface EstimateRequestContext {
  userId: number;
  latitude: { toNumber(): number } | null;
  longitude: { toNumber(): number } | null;
  createdAt: Date;
  targetShops: Array<{
    shop: { id: number; name: string };
  }>;
}

const buildPhoneCandidates = (phoneNumber: string): string[] => {
  const digits = phoneNumber.replace(/\D/g, '');
  const candidates = new Set([phoneNumber, digits]);
  const localDigits = digits.startsWith('82') ? `0${digits.slice(2)}` : digits;

  candidates.add(localDigits);

  if (localDigits.length === 11) {
    candidates.add(`${localDigits.slice(0, 3)}-${localDigits.slice(3, 7)}-${localDigits.slice(7)}`);
  } else if (localDigits.length === 10) {
    candidates.add(`${localDigits.slice(0, 3)}-${localDigits.slice(3, 6)}-${localDigits.slice(6)}`);
  }

  return [...candidates];
};

export class PrismaEstimateResponseRepository implements EstimateResponseRepository {
  async createSmsMessage(request: CreateSmsMessageRequest): Promise<CreatedSmsMessage> {
    return getPrisma().$transaction(async (prisma) => {
      const message = await prisma.smsMessage.upsert({
        where: {
          source_direction_messageId: {
            source: request.source,
            direction: 'INBOUND',
            messageId: request.messageId,
          },
        },
        create: {
          source: request.source,
          messageId: request.messageId,
          direction: 'INBOUND',
          rawPayload: request.rawPayload as Prisma.InputJsonValue,
        },
        update: {},
      });

      if (message.requestId && message.shopId) {
        return message;
      }

      const shop = await prisma.shop.findFirst({
        where: {
          isDataActive: true,
          phoneNumber: { in: buildPhoneCandidates(request.rawPayload.address) },
        },
        orderBy: { id: 'asc' },
        select: { id: true },
      });

      if (!shop) {
        return prisma.smsMessage.update({
          where: { id: message.id },
          data: { status: 'FAILED', errorMessage: '발신번호와 일치하는 샵을 찾을 수 없습니다.' },
        });
      }

      const outboundMessage = await prisma.smsMessage.findFirst({
        where: {
          direction: 'OUTBOUND',
          shopId: shop.id,
          requestId: { not: null },
          request: { status: 'MATCHING' },
          createdAt: { lte: new Date(request.rawPayload.receivedAt) },
        },
        orderBy: { createdAt: 'desc' },
        select: { requestId: true },
      });

      if (!outboundMessage?.requestId) {
        return prisma.smsMessage.update({
          where: { id: message.id },
          data: {
            shopId: shop.id,
            status: 'FAILED',
            errorMessage: '연결할 발송 견적 기록을 찾을 수 없습니다.',
          },
        });
      }

      return prisma.smsMessage.update({
        where: { id: message.id },
        data: {
          requestId: outboundMessage.requestId,
          shopId: shop.id,
          status: 'PENDING',
          errorMessage: null,
        },
      });
    });
  }

  // 견적 요청의 소유자 userId 조회 - 403 접근 권한 확인용
  async findRequestOwner(requestId: number): Promise<{ userId: number } | null> {
    return getPrisma().estimateRequest.findUnique({
      where: { id: requestId },
      select: { userId: true },
    });
  }

  // 해당 요청에 제출된 견적 중 최저가(totalPrice). 응답이 없거나 가격이 모두 null이면 null.
  // "더 낮은 견적 도착" 판정에 사용한다(저장 직전에 호출해 이전 최저가를 얻는다).
  async findLowestSubmittedPrice(requestId: number): Promise<number | null> {
    const result = await getPrisma().estimateResponse.aggregate({
      where: { requestId, status: 'SUBMITTED', totalPrice: { not: null } },
      _min: { totalPrice: true },
    });
    return result._min.totalPrice ?? null;
  }

  async findDetail(responseId: number): Promise<EstimateResponseDetail | null> {
    return getPrisma().estimateResponse.findUnique({
      where: { id: responseId },
      select: {
        id: true,
        requestId: true,
        shopId: true,
        totalPrice: true,
        basePrice: true,
        removalPrice: true,
        extraPrice: true,
        estimatedDurationMinutes: true,
        canProvideService: true,
        isRemovalIncluded: true,
        memo: true,
        status: true,
        createdAt: true,
        shop: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            address: true,
            addressDetail: true,
            latitude: true,
            longitude: true,
            rating: true,
            reviewCount: true,
            businessHours: true,
            closedDays: true,
          },
        },
        proposalTimes: {
          select: { proposalDatetime: true },
          orderBy: { proposalDatetime: 'asc' },
        },
      },
    });
  }

  async findList(requestId: number): Promise<EstimateResponseListRecord[]> {
    return getPrisma().estimateResponse.findMany({
      where: { requestId },
      select: {
        id: true,
        totalPrice: true,
        removalPrice: true,
        estimatedDurationMinutes: true,
        canProvideService: true,
        isRemovalIncluded: true,
        status: true,
        createdAt: true,
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
            rating: true,
            reviewCount: true,
          },
        },
        proposalTimes: {
          select: { proposalDatetime: true },
          orderBy: { proposalDatetime: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRequestContext(requestId: number): Promise<EstimateRequestContext | null> {
    return getPrisma().estimateRequest.findUnique({
      where: { id: requestId },
      select: {
        userId: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        targetShops: { select: { shop: { select: { id: true, name: true } } } },
      },
    });
  }

  async findAverageResponseMinutes(shopIds: number[]): Promise<Map<number, number>> {
    if (shopIds.length === 0) return new Map();

    const rows = await getPrisma().estimateResponse.findMany({
      where: { shopId: { in: shopIds } },
      select: { shopId: true, createdAt: true, request: { select: { createdAt: true } } },
    });
    const samples = new Map<number, number[]>();
    for (const row of rows) {
      const minutes = Math.max(
        1,
        Math.round((row.createdAt.getTime() - row.request.createdAt.getTime()) / 60_000),
      );
      const values = samples.get(row.shopId) ?? [];
      values.push(minutes);
      samples.set(row.shopId, values);
    }
    return new Map(
      [...samples].map(([shopId, values]) => [
        shopId,
        Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
      ]),
    );
  }

  async findSmsParsingContext(
    requestId: number,
    shopId: number,
  ): Promise<SmsParsingContext | null> {
    const request = await getPrisma().estimateRequest.findUnique({
      where: { id: requestId },
      select: {
        startDate: true,
        endDate: true,
        smsMessages: {
          where: { shopId, direction: 'INBOUND' },
          select: { rawPayload: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!request) {
      return null;
    }

    return {
      requestStartDate: request.startDate,
      requestEndDate: request.endDate,
      messages: request.smsMessages.reverse().map(({ rawPayload }) => rawPayload),
    };
  }

  async saveParsedEstimateResponse(
    smsMessageId: number,
    requestId: number,
    shopId: number,
    input: SaveParsedEstimateResponseInput,
  ): Promise<CreatedSmsMessage> {
    return getPrisma().$transaction(async (prisma) => {
      const existingResponse = await prisma.estimateResponse.findUnique({
        where: { requestId_shopId: { requestId, shopId } },
        select: { status: true },
      });
      const parsedStatus = input.canProvideService ? 'SUBMITTED' : 'REJECTED';

      const estimateResponse = await prisma.estimateResponse.upsert({
        where: { requestId_shopId: { requestId, shopId } },
        create: {
          requestId,
          shopId,
          totalPrice: input.totalPrice,
          basePrice: input.basePrice,
          removalPrice: input.removalPrice,
          extraPrice: input.extraPrice,
          memo: input.memo,
          estimatedDurationMinutes: input.estimatedDurationMinutes,
          canProvideService: input.canProvideService,
          isRemovalIncluded: input.isRemovalIncluded,
          status: parsedStatus,
        },
        update: {
          totalPrice: input.totalPrice,
          basePrice: input.basePrice,
          removalPrice: input.removalPrice,
          extraPrice: input.extraPrice,
          memo: input.memo,
          estimatedDurationMinutes: input.estimatedDurationMinutes,
          canProvideService: input.canProvideService,
          isRemovalIncluded: input.isRemovalIncluded,
          status: existingResponse?.status === 'ACCEPTED' ? 'ACCEPTED' : parsedStatus,
        },
        select: { id: true },
      });

      const selectedProposalTimes = await prisma.shopProposalTime.findMany({
        where: { proposalId: estimateResponse.id, isSelected: true },
        select: { proposalDatetime: true },
      });
      const selectedTimestamps = new Set(
        selectedProposalTimes.map(({ proposalDatetime }) => proposalDatetime.getTime()),
      );

      await prisma.shopProposalTime.deleteMany({
        where: { proposalId: estimateResponse.id, isSelected: false },
      });

      const newProposalTimes = input.proposalDateTimes.filter(
        (proposalDatetime) => !selectedTimestamps.has(proposalDatetime.getTime()),
      );
      if (newProposalTimes.length > 0) {
        await prisma.shopProposalTime.createMany({
          data: newProposalTimes.map((proposalDatetime) => ({
            proposalId: estimateResponse.id,
            proposalDatetime,
          })),
        });
      }

      await prisma.smsMessage.updateMany({
        where: { requestId, shopId, direction: 'INBOUND' },
        data: {
          status: 'PARSED',
          errorMessage: null,
          estimateResponseId: estimateResponse.id,
        },
      });

      return prisma.smsMessage.findUniqueOrThrow({ where: { id: smsMessageId } });
    });
  }

  async updateSmsMessageStatus(
    smsMessageId: number,
    status: 'PENDING' | 'FAILED',
    errorMessage: string | null,
  ): Promise<CreatedSmsMessage> {
    return getPrisma().smsMessage.update({
      where: { id: smsMessageId },
      data: { status, errorMessage },
    });
  }

  async findProposalTimes(responseId: number): Promise<ProposalTimeRecord[] | null> {
    const response = await getPrisma().estimateResponse.findUnique({
      where: { id: responseId },
      select: {
        proposalTimes: {
          select: {
            id: true,
            proposalDatetime: true,
            isSelected: true,
          },
          orderBy: { proposalDatetime: 'asc' },
        },
      },
    });

    return response?.proposalTimes ?? null;
  }
}
