import type {
  CreateUserAddressRequest,
  UpdateUserAddressRequest,
} from '../dto/user-address-request';
import type {
  UserAddressResponse,
  UserAddressListResponse,
  DeleteUserAddressResponse,
} from '../dto/user-address-response';
import {
  DefaultUserAddressRequiredError,
  UserAddressNotFoundError,
} from '../error/user-address.error';
import { UserAddressRepository } from '../repository/user-address.repository';

type AddressRecord = NonNullable<Awaited<ReturnType<UserAddressRepository['findByIdForUser']>>>;

export class UserAddressService {
  constructor(private readonly repository = new UserAddressRepository()) {}

  async getAddresses(userId: number): Promise<UserAddressListResponse> {
    return { addresses: (await this.repository.findAll(userId)).map(this.toResponse) };
  }

  async createAddress(
    userId: number,
    request: CreateUserAddressRequest,
  ): Promise<UserAddressResponse> {
    return this.toResponse(await this.repository.create(userId, request));
  }

  async updateAddress(
    addressId: number,
    userId: number,
    request: UpdateUserAddressRequest,
  ): Promise<UserAddressResponse> {
    const address = await this.repository.findByIdForUser(addressId, userId);
    if (!address) throw new UserAddressNotFoundError({ addressId });
    if (address.isDefault && request.isDefault === false) {
      throw new DefaultUserAddressRequiredError({ addressId });
    }
    return this.toResponse(await this.repository.update(addressId, userId, request));
  }

  async deleteAddress(addressId: number, userId: number): Promise<DeleteUserAddressResponse> {
    const address = await this.repository.findByIdForUser(addressId, userId);
    if (!address) throw new UserAddressNotFoundError({ addressId });
    await this.repository.delete(addressId, userId, address.isDefault);
    return { addressId };
  }

  private toResponse(address: AddressRecord): UserAddressResponse {
    return {
      addressId: address.id,
      label: address.label,
      address: address.address,
      addressDetail: address.addressDetail,
      latitude: address.latitude.toNumber(),
      longitude: address.longitude.toNumber(),
      isDefault: address.isDefault,
    };
  }
}
