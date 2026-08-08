import { z } from 'zod';

const OptionalCursorSchema = z
  .string()
  .trim()
  .min(1)
  .transform(Number)
  .pipe(z.number().int().positive())
  .optional();

const LimitSchema = z
  .string()
  .trim()
  .min(1)
  .transform(Number)
  .pipe(z.number().int().min(1).max(50))
  .default(20);

export const GetShopListRequestSchema = z
  .object({
    cursor: OptionalCursorSchema,
    limit: LimitSchema,
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

export type GetShopListRequest = z.infer<typeof GetShopListRequestSchema>;
