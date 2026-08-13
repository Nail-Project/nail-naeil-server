import { z } from 'zod';

const addressFields = {
  label: z.string().trim().min(1).max(50),
  address: z.string().trim().min(1).max(255),
  addressDetail: z.string().trim().min(1).max(255).nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isDefault: z.boolean(),
};

export const CreateUserAddressRequestSchema = z.object(addressFields);

export const UpdateUserAddressRequestSchema = z
  .object(addressFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, '수정할 주소 정보를 입력해주세요.');

export const UserAddressPathSchema = z.object({
  addressId: z.coerce.number().int().positive().max(2_147_483_647),
});

export type CreateUserAddressRequest = z.infer<typeof CreateUserAddressRequestSchema>;
export type UpdateUserAddressRequest = z.infer<typeof UpdateUserAddressRequestSchema>;
