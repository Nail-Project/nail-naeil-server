import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/common/middlewares/error-handler.middleware';
import { createUserAddressRouter } from '../../src/user/route/user-address.route';
import type { UserAddressService } from '../../src/user/service/user-address.service';

vi.mock('../../src/common/middlewares/auth.middleware', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.userId = 1;
    next();
  },
}));

const address = {
  addressId: 1,
  label: '우리 집',
  address: '서울특별시 강남구 테헤란로 1',
  addressDetail: null,
  latitude: 37.4979,
  longitude: 127.0276,
  isDefault: true,
};

const createApp = () => {
  const fake = {
    getAddresses: vi.fn().mockResolvedValue({ addresses: [address] }),
    createAddress: vi.fn().mockResolvedValue(address),
    updateAddress: vi.fn().mockResolvedValue(address),
    deleteAddress: vi.fn().mockResolvedValue({ addressId: 1 }),
  };
  const app = express();
  app.use(express.json());
  app.use(
    '/api/v1/users/me/addresses',
    createUserAddressRouter(fake as unknown as UserAddressService),
  );
  app.use(errorHandler);
  return { app, fake };
};

describe('user address routes', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));

  it('주소 목록을 조회한다', async () => {
    const { app } = createApp();
    const response = await request(app).get('/api/v1/users/me/addresses');
    expect(response.status).toBe(200);
    expect(response.body.success.addresses).toHaveLength(1);
  });

  it('주소를 추가한다', async () => {
    const { app, fake } = createApp();
    const body = { ...address, addressId: undefined, isDefault: false };
    const response = await request(app).post('/api/v1/users/me/addresses').send(body);
    expect(response.status).toBe(201);
    expect(fake.createAddress).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ label: '우리 집' }),
    );
  });

  it('주소를 수정한다', async () => {
    const { app, fake } = createApp();
    const response = await request(app)
      .patch('/api/v1/users/me/addresses/1')
      .send({ label: '회사' });
    expect(response.status).toBe(200);
    expect(fake.updateAddress).toHaveBeenCalledWith(1, 1, { label: '회사' });
  });

  it('주소를 삭제한다', async () => {
    const { app, fake } = createApp();
    const response = await request(app).delete('/api/v1/users/me/addresses/1');
    expect(response.status).toBe(200);
    expect(fake.deleteAddress).toHaveBeenCalledWith(1, 1);
  });

  it('잘못된 주소 입력은 400을 반환한다', async () => {
    const { app } = createApp();
    const response = await request(app).post('/api/v1/users/me/addresses').send({ label: '' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('USER_ADDRESS_VALIDATION_FAILED');
  });
});
