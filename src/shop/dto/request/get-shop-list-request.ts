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

export const GetShopListRequestSchema = z.object({
  cursor: OptionalCursorSchema,
  limit: LimitSchema,
});

export type GetShopListRequest = z.infer<typeof GetShopListRequestSchema>;
