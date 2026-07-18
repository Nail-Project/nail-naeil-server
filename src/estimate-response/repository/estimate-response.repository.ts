import { getPrisma } from '../../infra/prisma';
import type { Prisma } from '../../generated/prisma/client';
import type { CreateSmsMessageRequest } from '../dto/request/create-sms-message-request';

export interface CreatedSmsMessage {
  id: number;
  messageId: string;
  direction: 'OUTBOUND' | 'INBOUND';
  status: 'PENDING' | 'SENT' | 'PARSED' | 'FAILED';
  createdAt: Date;
}

export interface EstimateResponseDetail {
  id: number;
  requestId: number;
  shopId: number;
  totalPrice: number;
  basePrice: number;
  removalPrice: number;
  extraPrice: number;
  memo: string | null;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
  shop: {
    id: number;
    name: string;
    phoneNumber: string | null;
    address: string;
    addressDetail: string | null;
  };
  proposalTimes: { proposalDatetime: Date }[];
}

export interface EstimateResponseListRecord {
  id: number;
  totalPrice: number;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
  shop: {
    id: number;
    name: string;
    address: string;
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
  findDetail(responseId: number): Promise<EstimateResponseDetail | null>;
  findList(requestId: number): Promise<EstimateResponseListRecord[]>;
  findProposalTimes(responseId: number): Promise<ProposalTimeRecord[] | null>;
}

export class PrismaEstimateResponseRepository implements EstimateResponseRepository {
  async createSmsMessage(request: CreateSmsMessageRequest): Promise<CreatedSmsMessage> {
    return getPrisma().smsMessage.create({
      data: {
        messageId: request.messageId,
        direction: 'INBOUND',
        rawPayload: request.rawPayload as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        messageId: true,
        direction: true,
        status: true,
        createdAt: true,
      },
    });
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
        status: true,
        createdAt: true,
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
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
