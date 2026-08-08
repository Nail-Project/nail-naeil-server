// POST /admin/api/v1/designs - 디자인 생성 요청 스키마
// 관리자 페이지 와이어프레임이 아직 없어서, 현재 Design 스키마 필드를 그대로 받는 형태로
// 우선 만들어두고 와이어프레임이 나오면 그에 맞춰 조정한다.
import { z } from 'zod';

// update-design-request.ts와 필드 정의를 공유한다 - default가 없는 "순수" 스키마여야
// partial() 했을 때 값이 실제로 optional(undefined 가능)해진다. z.object(...).partial()은
// default()가 걸린 필드엔 partial이 적용 안 되고 값이 항상 채워지는 zod 특성이 있어서,
// default는 각 스키마(create/update)가 자기 쪽에서 필요할 때만 따로 붙인다.
export const designAdminFields = {
  title: z.string().trim().min(1).max(100),
  imageUrl: z.string().trim().min(1).max(255),
  durationMinutes: z.number().int().positive(),
  difficulty: z.string().trim().min(1).max(20),
  recommendedShape: z.string().trim().min(1).max(20),
  description: z.string().trim().min(1).max(2000),
  // 캐러셀에 쓰일 추가 이미지 - 순서대로 저장된다. 개수 상한은 과도한 payload를 막기 위함.
  images: z.array(z.string().trim().min(1).max(255)).max(10),
  // 태그는 이름으로 받는다 - 이미 있는 이름이면 재사용, 없으면 새로 생성한다(upsert).
  tags: z.array(z.string().trim().min(1).max(50)).max(20),
};

export const CreateDesignRequest = z.object({
  ...designAdminFields,
  images: designAdminFields.images.default([]),
  tags: designAdminFields.tags.default([]),
});

export type CreateDesignRequestType = z.infer<typeof CreateDesignRequest>;
