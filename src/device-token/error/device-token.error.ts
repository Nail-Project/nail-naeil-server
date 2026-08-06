import { AppError } from '../../common/errors/app.error';

// POST/DELETE /api/v1/device-tokens - 유효하지 않은 token/platform 등 Body 값
export class InvalidDeviceTokenRequestError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INVALID_DEVICE_TOKEN_REQUEST',
      statusCode: 400,
      message: '유효하지 않은 요청입니다.',
      data,
    });
  }
}
