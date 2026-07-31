// POST /api/v1/estimate-request - 견적 요청 생성 시 Request Body 검증 스키마
// zod로 런타임 검증 후 타입을 추론해 controller → service → repository에서 그대로 사용한다.
import { z } from 'zod';

export const CreateEstimateRequestSchema = z.object({
  // 네일 종류: 손(HAND), 발(PEDICURE), 손+발(BOTH)
  nailType: z.enum(['HAND', 'PEDICURE', 'BOTH']),

  // 제거 종류: 연장(EXTENSION), 부분(PARTS), 기본(BASIC), 없음(NONE)
  removalType: z.enum(['EXTENSION', 'PARTS', 'BASIC', 'NONE']),

  // 희망 시술 기간 - YYYY-MM-DD 형식만 허용, DB 저장 시 Date로 변환
  // endDate는 startDate 이후여야 한다 (같은 날은 허용).
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다.'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다.'),

  // 선호 시간대: 오전(AM), 오후(PM), 저녁(EVENING), 무관(ANY)
  preferredTime: z.enum(['AM', 'PM', 'EVENING', 'ANY']),

  // 샵 추천 기준: 균형(BALANCED), 가까운 순(CLOSE), 넓은 범위(WIDE), 저렴한 순(CHEAP)
  recommendType: z.enum(['BALANCED', 'CLOSE', 'WIDE', 'CHEAP']),

  // 추가 요청 사항 (선택)
  description: z.string().optional(),

  // 디자인 이미지 URL 목록 - image 도메인에서 미리 업로드 후 URL을 받아 전달한다.
  // 빈 배열로 기본값을 설정해 프론트가 필드를 생략해도 정상 처리되도록 한다.
  images: z.array(z.string()).optional().default([]),

  // 견적을 보낼 샵 ID 목록 - 주변 샵 조회 API에서 받은 shopId 목록을 전달한다.
  // 빈 배열이면 NO_SHOPS_SELECTED(400) 에러를 반환한다.
  // 최대 20개로 제한 - 대량 문자 발송 비용 남용 방지 (추후 샵 탐색 API 설계 시 재검토)
  shopIds: z.array(z.number().int().positive()).min(1, '견적 요청할 샵이 없습니다.').max(20, '한 번에 요청할 수 있는 샵 수를 초과했습니다.'),
}).refine((data) => data.endDate >= data.startDate, {
  // endDate가 startDate보다 앞이면 400 반환
  message: '종료일은 시작일 이후여야 합니다.',
  path: ['endDate'],
});

export type CreateEstimateRequestDto = z.infer<typeof CreateEstimateRequestSchema>;
