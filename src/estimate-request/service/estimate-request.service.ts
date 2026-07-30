import path from 'path';
import fs from 'fs';
import { SolapiMessageService } from 'solapi';
import { EstimateRequestRepository } from '../repository/estimate-request.repository';
import { CreateEstimateRequestDto } from '../dto/request/create-estimate-request.dto';
import { CreateEstimateResponseDto } from '../dto/response/create-estimate-response.dto';
import { GetEstimatesResponseDto } from '../dto/response/get-estimates-response.dto';
import { EstimateRequestFailedError, InternalServerError } from '../../common/errors/common.error';

// ─── SMS 발신 서비스 ────────────────────────────────────────────────────────────
// SMS_ENABLED=true 일 때만 실제 발송을 시도한다.
// COOLSMS_API_KEY, COOLSMS_API_SECRET, SMS_FROM은 .env에서 관리한다.
const SMS_ENABLED = process.env.SMS_ENABLED === 'true';
const SMS_FROM = process.env.SMS_FROM ?? '';

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

  // 이미지가 없으면 LMS(텍스트), 있으면 이미지 수만큼 MMS를 순차 발송한다.
  // 첫 번째 MMS에만 텍스트를 포함하고 이후 이미지는 추가 MMS로 발송한다.
  // to에 배열을 넘기면 Solapi가 한 번의 API 호출로 여러 수신자에게 동시 발송한다.
  // 발송 실패해도 견적 요청 자체를 막지 않는다. 로그만 남기고 계속 진행한다.
  async sendToShops(phoneNumbers: string[], text: string, imageUrls: string[]): Promise<void> {
    if (!SMS_ENABLED || !this.client) {
      console.log(`[SmsService] SMS 발송 건너뜀 (SMS_ENABLED=${SMS_ENABLED}, client=${!!this.client})`);
      return;
    }

    try {
      if (imageUrls.length === 0) {
        // 이미지 없음 → LMS (텍스트만 전송)
        await this.client.send({ to: phoneNumbers, from: SMS_FROM, text, autoTypeDetect: true });
        return;
      }

      const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';

      // 이미지마다 Solapi에 업로드 후 MMS 발송
      // 첫 번째 이미지에만 텍스트 포함, 이후 이미지는 본문 없이 이미지만 발송
      let isFirst = true;
      for (const imageUrl of imageUrls) {
        const filePath = imageUrl.replace(`${baseUrl}/`, '');
        const absolutePath = path.join(process.cwd(), filePath);

        if (!fs.existsSync(absolutePath)) {
          console.warn(`[SmsService] 이미지 파일 없음, 건너뜀: ${absolutePath}`);
          continue;
        }

        const { fileId } = await this.client.uploadFile(absolutePath, 'MMS');

        await this.client.send({
          to: phoneNumbers,
          from: SMS_FROM,
          text: isFirst ? text : ' ', // 첫 번째 MMS에만 견적 내용 포함
          imageId: fileId,
        });

        isFirst = false;
      }
    } catch (error) {
      console.error('[SmsService] MMS 발송 실패:', error);
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
  // 1. DB에 견적 요청 저장
  // 2. DTO를 문자 내용으로 변환
  // 3. SMS API로 샵에 문자 발송
  // userId는 auth 미들웨어가 JWT에서 추출한 값을 controller가 전달한다.
  // TODO: [yej] 샵 전화번호를 어디서 가져올지 확정 후 실제 번호로 교체한다.
  //   현재는 임시 번호로 발송하며, 추후 매칭된 샵 목록의 phoneNumber를 사용한다.
  async createEstimateRequest(dto: CreateEstimateRequestDto, userId: number): Promise<CreateEstimateResponseDto> {
    try {
      // ① DB 저장
      const result = await this.repository.create(dto, userId);

      // ② DTO → 문자 문자열 변환
      const smsText = formatSmsText(dto);

      // ③ shopIds로 전화번호 조회 후 각 샵에 SMS 발송
      // phoneNumber가 없는 샵은 건너뛴다.
      // SMS 발송 실패해도 견적 요청 자체는 정상 완료 처리한다.
      // shopIds로 전화번호 조회 후 한 번에 발송 (sendMany = API 호출 1번)
      const phoneNumbers = await this.repository.findPhoneNumbersByShopIds(dto.shopIds);
      await this.smsService.sendToShops(
        phoneNumbers,
        smsText,
        result.images.map((img) => img.imageUrl),
      );

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
