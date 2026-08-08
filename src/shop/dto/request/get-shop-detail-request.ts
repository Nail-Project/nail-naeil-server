import { z } from 'zod';

export const ShopIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().positive());

export const GetShopDetailRequestSchema = z
  .object({
    shopId: ShopIdSchema,
    latitude: z
      .string()
      .trim()
      .min(1)
      .transform(Number)
      .pipe(z.number().min(-90).max(90))
      .optional(),
    longitude: z
      .string()
      .trim()
      .min(1)
      .transform(Number)
      .pipe(z.number().min(-180).max(180))
      .optional(),
  })
  .refine((data) => (data.latitude === undefined) === (data.longitude === undefined), {
    message: '위도와 경도는 함께 입력해야 합니다.',
    path: ['latitude'],
  });

export type GetShopDetailRequest = z.infer<typeof GetShopDetailRequestSchema>;
