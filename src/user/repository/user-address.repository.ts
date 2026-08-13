import { getPrisma } from '../../infra/prisma';
import type {
  CreateUserAddressRequest,
  UpdateUserAddressRequest,
} from '../dto/user-address-request';

const addressSelect = {
  id: true,
  label: true,
  address: true,
  addressDetail: true,
  latitude: true,
  longitude: true,
  isDefault: true,
} as const;

export class UserAddressRepository {
  findAll(userId: number) {
    return getPrisma().userAddress.findMany({
      where: { userId },
      select: addressSelect,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  findByIdForUser(addressId: number, userId: number) {
    return getPrisma().userAddress.findFirst({
      where: { id: addressId, userId },
      select: addressSelect,
    });
  }

  async create(userId: number, data: CreateUserAddressRequest) {
    return getPrisma().$transaction(async (tx) => {
      const count = await tx.userAddress.count({ where: { userId } });
      const isDefault = data.isDefault || count === 0;
      if (isDefault)
        await tx.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.userAddress.create({ data: { ...data, userId, isDefault }, select: addressSelect });
    });
  }

  async update(addressId: number, userId: number, data: UpdateUserAddressRequest) {
    return getPrisma().$transaction(async (tx) => {
      if (data.isDefault)
        await tx.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.userAddress.update({ where: { id: addressId }, data, select: addressSelect });
    });
  }

  async delete(addressId: number, userId: number, wasDefault: boolean) {
    await getPrisma().$transaction(async (tx) => {
      await tx.userAddress.delete({ where: { id: addressId } });
      if (wasDefault) {
        const next = await tx.userAddress.findFirst({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        if (next)
          await tx.userAddress.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
  }
}
