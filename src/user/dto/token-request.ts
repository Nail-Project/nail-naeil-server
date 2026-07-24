// POST /api/users/auth/refresh, /logout - refreshToken Request Body 검증 스키마
import { z } from 'zod';

export const TokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken이 필요합니다.'),
});

export type TokenRequest = z.infer<typeof TokenRequestSchema>;
