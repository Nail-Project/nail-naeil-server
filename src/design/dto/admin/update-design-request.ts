// PATCH /admin/api/v1/designs/:designId - 디자인 수정 요청 스키마
// 부분 수정(PATCH) - 전달된 필드만 갱신한다. images/tags를 전달하면 기존 목록 전체를 대체한다.
import { z } from 'zod';
import { designAdminFields } from './create-design-request';

export const UpdateDesignRequest = z
  .object(designAdminFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: '수정할 필드를 하나 이상 전달해야 합니다.',
  });

export type UpdateDesignRequestType = z.infer<typeof UpdateDesignRequest>;
