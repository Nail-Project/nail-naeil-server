import fs from 'fs';
import os from 'os';
import path from 'path';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SolapiMessageService } from 'solapi';
import { EstimateRequestRepository } from '../repository/estimate-request.repository';
import { CreateEstimateRequestDto } from '../dto/request/create-estimate-request.dto';
import { CreateEstimateResponseDto } from '../dto/response/create-estimate-response.dto';
import { GetEstimatesResponseDto } from '../dto/response/get-estimates-response.dto';
import { EstimateRequestFailedError, InternalServerError } from '../../common/errors/common.error';

// ─── SMS 설정 ───────────────────────────────────────────────────────────────────
const SMS_ENABLED = process.env.SMS_ENABLED === 'true';
const SMS_FROM = process.env.SMS_FROM ?? '';
const SMS_TIMEOUT_MS = 10_000; // 1회 발송 최대 대기 시간

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`SMS 타임아웃: ${ms}ms 초과`)), ms)
    ),
  ]);
}

// Solapi 에러에서 사용자에게 전달할 실패 이유를 추출한다.
// DefaultError / MessageNotReceivedError: errorCode + errorMessage 필드 보유
// 그 외 에러: message 필드 사용
function extractSmsErrorReason(error: unknown): string {
  if (error instanceof Error) {
    const solapiError = error as Error & { errorCode?: string; errorMessage?: string };
    if (solapiError.errorMessage) {
      return solapiError.errorCode
        ? `[${solapiError.errorCode}] ${solapiError.errorMessage}`
        : solapiError.errorMessage;
    }
    return error.message;
  }
  return '알 수 없는 오류';
}

// ─── SMS 발신 서비스 ────────────────────────────────────────────────────────────
class SmsService {
  private readonly client: SolapiMessageService | null;

  constructor() {
    const apiKey = process.env.COOLSMS_API_KEY;
    const apiSecret = process.env.COOLSMS_API_SECRET;

    if (apiKey && apiSecret) {
      this.client = new SolapiMessageService(apiKey, apiSecret);
    } else {
      this.client = null;
      console.warn('[SmsService] COOLSMS_API_KEY 또는 COOLSMS_API_SECRET이 설정되지 않았습니다.');
    }
  }

  // S3 이미지 URL → 임시 파일 다운로드 → Solapi fileId 변환
  // 업로드 실패한 이미지는 건너뛰고, 임시 파일은 업로드 후 삭제한다.
  private async uploadImages(imageUrls: string[]): Promise<string[]> {
    if (!this.client || imageUrls.length === 0) return [];

    const s3 = new S3Client({
      region: process.env.AWS_REGION ?? 'ap-northeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
    });
    const bucket = process.env.S3_BUCKET_NAME ?? '';
    const fileIds: string[] = [];

    for (const imageUrl of imageUrls) {
      // S3 URL에서 key 추출 (예: images/2026-08-01/uuid.jpg)
      const urlObj = new URL(imageUrl);
      const key = urlObj.pathname.replace(/^\//, '');
      const tmpPath = path.join(os.tmpdir(), path.basename(key));

      try {
        // S3에서 임시 파일로 다운로드
        const { Body } = await withTimeout(
          s3.send(new GetObjectCommand({ Bucket: bucket, Key: key })),
          SMS_TIMEOUT_MS,
        );
        if (!Body) {
          console.warn(`[SmsService] S3 응답 바디 없음, 건너뜀: ${key}`);
          continue;
        }
        const buffer = Buffer.from(await Body.transformToByteArray());
        fs.writeFileSync(tmpPath, buffer);

        // Solapi에 임시 파일 업로드
        const { fileId } = (await withTimeout(this.client.uploadFile(tmpPath, 'MMS'), SMS_TIMEOUT_MS)) as { fileId: string };
        fileIds.push(fileId);
      } catch (error) {
        console.warn(`[SmsService] 이미지 업로드 실패, 건너뜀: ${key}`, error);
      } finally {
        // 임시 파일 정리
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      }
    }

    return fileIds;
  }

  // 모든 샵에 SMS/MMS 발송 (1회 시도)
  // 실패 시 에러를 throw → 호출부에서 EstimateRequestFailedError로 변환해 클라이언트에 반환한다.
  // 재시도는 클라이언트가 견적 요청을 다시 보내는 방식으로 처리한다.
  // SMS_ENABLED=false 또는 API Key 미설정이면 발송 없이 정상 통과한다.
  async sendToShops(phoneNumbers: string[], text: string, imageUrls: string[]): Promise<void> {
    if (!SMS_ENABLED || !this.client) {
      console.log('[SmsService] SMS 발송 건너뜀');
      return;
    }

    const fileIds = await this.uploadImages(imageUrls);

    // 이미지 없으면 LMS 1건, 있으면 이미지 수만큼 MMS 발송
    // 첫 번째 MMS에만 본문 텍스트 포함
    const sendTasks: Array<{ text: string; imageId?: string }> =
      fileIds.length === 0
        ? [{ text }]
        : fileIds.map((fileId, i) => ({ text: i === 0 ? text : ' ', imageId: fileId }));

    for (const task of sendTasks) {
      await withTimeout(
        this.client.send({
          to: phoneNumbers,
          from: SMS_FROM,
          text: task.text,
          ...(task.imageId ? { imageId: task.imageId } : { autoTypeDetect: true }),
        }),
        SMS_TIMEOUT_MS,
      );
    }
  }
}

// ─── 문자 내용 변환 ─────────────────────────────────────────────────────────────

// 네일 타입 한글 변환
const NAIL_TYPE_LABEL: Record<string, string> = {
  HAND: '손 네일',
  PEDICURE: '발 네일',
  BOTH: '손 + 발 네일',
};

// 제거 타입 한글 변환
const REMOVAL_TYPE_LABEL: Record<string, string> = {
  EXTENSION: '연장 제거',
  PARTS: '부분 제거',
  BASIC: '기본 제거',
  NONE: '제거 없음',
};

// 선호 시간대 한글 변환
const PREFERRED_TIME_LABEL: Record<string, string> = {
  AM: '오전',
  PM: '오후',
  EVENING: '저녁',
  ANY: '무관',
};

// 추천 기준 한글 변환
const RECOMMEND_TYPE_LABEL: Record<string, string> = {
  BALANCED: '균형 추천',
  CLOSE: '가까운 순',
  WIDE: '넓은 범위',
  CHEAP: '저렴한 순',
};

// DTO를 SMS 문자 문자열로 변환
// TODO: [yej] AI 연동 확정 후 이 메서드 대신 AI 서비스를 호출하는 방식으로 교체한다.
//   예) const text = await aiService.generateSmsText(dto);
//   현재는 DTO 필드를 단순 한글 텍스트로 조합해 임시 사용한다.
function formatSmsText(dto: CreateEstimateRequestDto): string {
  const lines = [
    '[네일내일] 견적 요청이 도착했습니다.',
    '',
    `· 종류: ${NAIL_TYPE_LABEL[dto.nailType] ?? dto.nailType}`,
    `· 제거: ${REMOVAL_TYPE_LABEL[dto.removalType] ?? dto.removalType}`,
    `· 희망 기간: ${dto.startDate} ~ ${dto.endDate}`,
    `· 선호 시간: ${PREFERRED_TIME_LABEL[dto.preferredTime] ?? dto.preferredTime}`,
    `· 추천 기준: ${RECOMMEND_TYPE_LABEL[dto.recommendType] ?? dto.recommendType}`,
  ];

  if (dto.description) {
    lines.push(`· 요청 사항: ${dto.description}`);
  }

  lines.push('', '가격과 가능한 날짜/시간을 이 번호로 문자 답장해주세요.');

  return lines.join('\n');
}

// ─── EstimateRequestService ────────────────────────────────────────────────────

export class EstimateRequestService {
  private readonly repository = new EstimateRequestRepository();
  private readonly smsService = new SmsService();

  // 견적 요청 생성
  // ① SMS 발송 — 실패 시 DB 저장 없이 EstimateRequestFailedError + 실패 이유 반환
  // ② SMS 성공 후 DB 저장
  // userId는 auth 미들웨어가 JWT에서 추출한 값을 controller가 전달한다.
  async createEstimateRequest(dto: CreateEstimateRequestDto, userId: number): Promise<CreateEstimateResponseDto> {
    // ① SMS 발송 (실패 시 DB 저장 없이 즉시 에러 반환)
    try {
      const smsText = formatSmsText(dto);
      const shops = await this.repository.findShopsByIds(dto.shopIds);
      const phoneNumbers = shops.map((s) => s.phoneNumber);
      // SMS MMS 발송은 첫 번째 이미지 1장만 전송 (추후 기획 확정 후 조정)
      const smsImages = dto.images.slice(0, 1);
      await this.smsService.sendToShops(phoneNumbers, smsText, smsImages);
    } catch (error) {
      // 내부 에러 상세(IP, API 키 관련 정보 등)는 서버 로그에만 기록하고 클라이언트에 노출하지 않는다.
      console.error('[EstimateRequestService] SMS 발송 실패:', extractSmsErrorReason(error));
      throw new EstimateRequestFailedError();
    }

    // ② DB 저장 (SMS 성공 후)
    try {
      const result = await this.repository.create(dto, userId);
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
    userId: number,
  ): Promise<GetEstimatesResponseDto[]> {
    try {
      const estimates = await this.repository.findByStatus(status, userId);

      return estimates.map((estimate) => {
        const proposals = estimate.proposals;

        // 전체 견적 응답(샵 제안) 수
        const proposalCount = proposals.length;

        // SUBMITTED: 샵에서 견적을 제출했지만 사용자가 아직 수락/거절하지 않은 상태
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
