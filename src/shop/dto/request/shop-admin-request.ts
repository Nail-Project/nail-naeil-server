import { z } from 'zod';

const nullableString = (max: number) => z.string().trim().min(1).max(max).nullable();

export const shopAdminFields = {
  name: z.string().trim().min(1).max(100),
  phoneNumber: nullableString(20).optional(),
  address: z.string().trim().min(1).max(255),
  addressDetail: nullableString(255).optional(),
  provinceCode: nullableString(10).optional(),
  provinceName: nullableString(50).optional(),
  districtCode: nullableString(10).optional(),
  districtName: nullableString(50).optional(),
  adminDongCode: nullableString(20).optional(),
  adminDongName: nullableString(50).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationGuide: nullableString(255).optional(),
  parkingInfo: nullableString(255).optional(),
  thumbnailImageUrl: nullableString(500).optional(),
  businessHours: z.record(z.string(), z.unknown()).nullable().optional(),
  closedDays: z.array(z.string().trim().min(1).max(30)).max(31).nullable().optional(),
};

export const CreateShopAdminRequest = z.object(shopAdminFields).strict();

export const UpdateShopAdminRequest = z
  .object(shopAdminFields)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: '수정할 필드를 하나 이상 전달해야 합니다.',
  });

export const ShopAdminIdPath = z.object({
  shopId: z.coerce.number().int().positive(),
});

export const GetShopsAdminQuery = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  active: z.enum(['true', 'false', 'all']).default('all'),
});

export type CreateShopAdminRequestType = z.infer<typeof CreateShopAdminRequest>;
export type UpdateShopAdminRequestType = z.infer<typeof UpdateShopAdminRequest>;
export type GetShopsAdminQueryType = z.infer<typeof GetShopsAdminQuery>;
