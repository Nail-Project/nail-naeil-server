import { EstimateRequestRepository } from '../repository/estimate-request.repository';
import { CreateEstimateRequestDto } from '../dto/request/create-estimate-request.dto';
import { CreateEstimateResponseDto } from '../dto/response/create-estimate-response.dto';
import { GetEstimatesResponseDto } from '../dto/response/get-estimates-response.dto';
import { EstimateRequestFailedError, InternalServerError } from '../../common/errors/common.error';

// ─── SMS 발신 서비스 ────────────────────────────────────────────────────────────
// SMS_ENABLED=true 일 때만 실제 발송을 시도한다.
// SMS API 확정 전까지는 .env에서 SMS_ENABLED를 설정하지 않으면 발송을 건너뛴다.
// TODO: [yej] SMS API 확정 후 아래 항목을 실제 값으로 교체한다.
//   - SMS_API_URL: CoolSMS / NCP 등 확정된 서비스의 엔드포인트
//   - SMS_API_KEY: 발급받은 API 키 (환경변수로 관리)
//   - SMS_FROM: 릴레이 기기 전화번호 (발신번호 등록 필요)
const SMS_ENABLED = process.env.SMS_ENABLED === 'true';
const SMS_API_URL = process.env.SMS_API_URL ?? '';
const SMS_API_KEY = process.env.SMS_API_KEY ?? '';
const SMS_FROM = process.env.SMS_FROM ?? '';

class SmsService {
  // SMS API로 문자 발송
  // SMS_ENABLED가 false면 로그만 출력하고 실제 발송은 건너뛴다.
  // TODO: [yej] SMS API 확정 후 실제 SDK / HTTP 클라이언트로 교체한다.
  //   예) import coolsms from 'coolsms-node-sdk';
  async send(to: string, text: string): Promise<void> {
    if (!SMS_ENABLED) {
      console.log('[SmsService] SMS 미연동 상태 (SMS_ENABLED=false). 발송 건너뜀.');
      return;
    }

    try {
      // 10초 안에 응답 없으면 타임아웃 처리
      const response = await fetch(SMS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SMS_API_KEY}`,
        },
        body: JSON.stringify({ from: SMS_FROM, to, text }),
        signal: AbortSignal.timeout(10_000),
      });

      // fetch는 4xx/5xx에서 reject되지 않으므로 response.ok로 명시적으로 확인한다.
      if (!response.ok) {
        throw new Error(`SMS API 응답 오류: ${response.status}`);
      }
    } catch (error) {
      // SMS 발송 실패는 견적 요청 자체를 막지 않는다.
      // 요청은 이미 DB에 저장됐으므로 로그만 남기고 계속 진행한다.
      // TODO: [yej] SMS API 확정 후 실패 정책 결정 필요
      //   - 재발송 로직 추가 여부 (예: 최대 3회 retry)
      //   - SMS 발송 실패 시 별도 에러 코드(SMS_SEND_FAILED)로 클라이언트에 알릴지 여부
      console.error('[SmsService] SMS 발송 실패:', error);
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
  // TODO: [yej] 샵 전화번호를 어디서 가져올지 확정 후 실제 번호로 교체한다.
  //   현재는 임시 번호로 발송하며, 추후 매칭된 샵 목록의 phoneNumber를 사용한다.
  async createEstimateRequest(dto: CreateEstimateRequestDto): Promise<CreateEstimateResponseDto> {
    try {
      // ① DB 저장
      const result = await this.repository.create(dto);

      // ② DTO → 문자 문자열 변환
      const smsText = formatSmsText(dto);

      // ③ SMS 발송 (실패해도 견적 요청은 정상 완료 처리)
      // TODO: [yej] 매칭된 샵 목록의 phoneNumber로 교체
      const tempShopPhone = '01000000000';
      await this.smsService.send(tempShopPhone, smsText);

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
  ): Promise<GetEstimatesResponseDto[]> {
    try {
      const estimates = await this.repository.findByStatus(status);

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
