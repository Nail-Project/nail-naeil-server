import { describe, expect, it, vi } from 'vitest';
import type { UserAddressRepository } from '../../src/user/repository/user-address.repository';
import { UserAddressService } from '../../src/user/service/user-address.service';

const decimal = (value: number) => ({ toNumber: () => value });
const address = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  label: '우리 집',
  address: '서울특별시 강남구 테헤란로 1',
  addressDetail: '101동 101호',
  latitude: decimal(37.4979),
  longitude: decimal(127.0276),
  isDefault: true,
  ...overrides,
});

const service = (repository: Partial<UserAddressRepository>) =>
  new UserAddressService(repository as UserAddressRepository);

describe('UserAddressService', () => {
  it('여러 주소를 응답 DTO로 반환한다', async () => {
    const target = service({
      findAll: vi
        .fn()
        .mockResolvedValue([address(), address({ id: 2, label: '회사', isDefault: false })]),
    });

    await expect(target.getAddresses(1)).resolves.toMatchObject({
      addresses: [
        { addressId: 1, label: '우리 집', latitude: 37.4979, isDefault: true },
        { addressId: 2, label: '회사', isDefault: false },
      ],
    });
  });

  it('주소를 추가한다', async () => {
    const create = vi.fn().mockResolvedValue(address());
    const target = service({ create });
    const request = {
      label: '우리 집',
      address: '서울특별시 강남구 테헤란로 1',
      addressDetail: '101동 101호',
      latitude: 37.4979,
      longitude: 127.0276,
      isDefault: false,
    };

    await expect(target.createAddress(1, request)).resolves.toMatchObject({ addressId: 1 });
    expect(create).toHaveBeenCalledWith(1, request);
  });

  it('본인 주소가 아니면 수정하지 않는다', async () => {
    const update = vi.fn();
    const target = service({ findByIdForUser: vi.fn().mockResolvedValue(null), update });

    await expect(target.updateAddress(10, 1, { label: '회사' })).rejects.toMatchObject({
      code: 'USER_ADDRESS_NOT_FOUND',
      statusCode: 404,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('기본 주소를 직접 해제하지 못하게 한다', async () => {
    const update = vi.fn();
    const target = service({ findByIdForUser: vi.fn().mockResolvedValue(address()), update });

    await expect(target.updateAddress(1, 1, { isDefault: false })).rejects.toMatchObject({
      code: 'DEFAULT_USER_ADDRESS_REQUIRED',
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('본인 주소를 삭제한다', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const target = service({
      findByIdForUser: vi.fn().mockResolvedValue(address()),
      delete: remove,
    });

    await expect(target.deleteAddress(1, 1)).resolves.toEqual({ addressId: 1 });
    expect(remove).toHaveBeenCalledWith(1, 1, true);
  });
});
