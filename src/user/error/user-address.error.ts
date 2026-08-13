import { AppError } from '../../common/errors/app.error';

export class UserAddressValidationError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'USER_ADDRESS_VALIDATION_FAILED',
      statusCode: 400,
      message: '주소 정보를 다시 확인해주세요.',
      data,
    });
  }
}

export class UserAddressNotFoundError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'USER_ADDRESS_NOT_FOUND',
      statusCode: 404,
      message: '주소를 찾을 수 없습니다.',
      data,
    });
  }
}

export class DefaultUserAddressRequiredError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'DEFAULT_USER_ADDRESS_REQUIRED',
      statusCode: 400,
      message: '다른 주소를 기본 주소로 먼저 설정해주세요.',
      data,
    });
  }
}
