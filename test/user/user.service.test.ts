import { describe, expect, it, vi } from 'vitest';
import { UserService } from '../../src/user/service/user.service';
import type { UserRepository } from '../../src/user/repository/user.repository';

// Prisma User 레코드 형태의 최소 fake 데이터
const userRecord = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  email: 'test@test.com',
  phoneNumber: '01012345678',
  nickname: '홍길동',
  profileImageUrl: null,
  role: 'CUSTOMER',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// 필요한 메서드만 가진 fake repository를 만들어 주입한다.
const createService = (repo: Partial<UserRepository>) =>
  new UserService(repo as unknown as UserRepository);

describe('UserService.getMyProfile', () => {
  it('존재하는 유저의 프로필을 응답 DTO로 반환한다', async () => {
    const service = createService({
      findById: vi.fn().mockResolvedValue(userRecord()),
    });

    await expect(service.getMyProfile(1)).resolves.toEqual({
      userId: 1,
      email: 'test@test.com',
      phoneNumber: '01012345678',
      nickname: '홍길동',
      profileImageUrl: null,
      role: 'CUSTOMER',
    });
  });

  it('유저가 없으면 USER_NOT_FOUND(404)를 던진다', async () => {
    const service = createService({
      findById: vi.fn().mockResolvedValue(null),
    });

    await expect(service.getMyProfile(999)).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
      statusCode: 404,
    });
  });
});

describe('UserService.updateMyProfile', () => {
  it('전달된 필드로 수정하고 갱신된 정보를 반환한다', async () => {
    const newImageUrl =
      'https://bucket.s3.ap-northeast-2.amazonaws.com/images/2026-08-05/0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d.jpg';
    const updateUser = vi.fn().mockResolvedValue(userRecord({ profileImageUrl: newImageUrl }));
    const service = createService({
      findById: vi.fn().mockResolvedValue(userRecord()),
      updateUser,
    });

    await expect(
      service.updateMyProfile(1, { profileImageUrl: newImageUrl }),
    ).resolves.toMatchObject({
      userId: 1,
      profileImageUrl: newImageUrl,
    });
    expect(updateUser).toHaveBeenCalledWith(1, { profileImageUrl: newImageUrl });
  });

  it('유저가 없으면 USER_NOT_FOUND(404)를 던지고 수정하지 않는다', async () => {
    const updateUser = vi.fn();
    const service = createService({
      findById: vi.fn().mockResolvedValue(null),
      updateUser,
    });

    await expect(service.updateMyProfile(999, { email: 'new@test.com' })).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('다른 유저가 쓰는 이메일로 변경하면 DUPLICATED_EMAIL(409)을 던진다', async () => {
    const updateUser = vi.fn();
    const service = createService({
      findById: vi.fn().mockResolvedValue(userRecord({ email: 'old@test.com' })),
      findUserByEmail: vi.fn().mockResolvedValue(userRecord({ id: 2, email: 'taken@test.com' })),
      updateUser,
    });

    await expect(service.updateMyProfile(1, { email: 'taken@test.com' })).rejects.toMatchObject({
      code: 'DUPLICATED_EMAIL',
      statusCode: 409,
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('본인이 이미 쓰던 이메일과 동일하면 중복 검사 없이 통과한다', async () => {
    const findUserByEmail = vi.fn();
    const service = createService({
      findById: vi.fn().mockResolvedValue(userRecord({ email: 'me@test.com' })),
      findUserByEmail,
      updateUser: vi.fn().mockResolvedValue(userRecord({ email: 'me@test.com' })),
    });

    await service.updateMyProfile(1, { email: 'me@test.com' });
    expect(findUserByEmail).not.toHaveBeenCalled();
  });
});

describe('UserService.deleteAccount', () => {
  it('유저가 있으면 토큰과 함께 삭제한다', async () => {
    const deleteUserWithTokens = vi.fn().mockResolvedValue([{ count: 1 }, userRecord()]);
    const service = createService({
      findById: vi.fn().mockResolvedValue(userRecord()),
      deleteUserWithTokens,
    });

    await service.deleteAccount(1);
    expect(deleteUserWithTokens).toHaveBeenCalledWith(1);
  });

  it('유저가 없으면 USER_NOT_FOUND(404)를 던지고 삭제하지 않는다', async () => {
    const deleteUserWithTokens = vi.fn();
    const service = createService({
      findById: vi.fn().mockResolvedValue(null),
      deleteUserWithTokens,
    });

    await expect(service.deleteAccount(999)).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
    });
    expect(deleteUserWithTokens).not.toHaveBeenCalled();
  });
});
