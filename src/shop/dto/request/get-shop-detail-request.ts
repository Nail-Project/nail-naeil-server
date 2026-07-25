import { z } from 'zod';

export const GetShopDetailRequestSchema = z.object({
  shopId: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().positive()),
});

export type GetShopDetailRequest = z.infer<typeof GetShopDetailRequestSchema>;
