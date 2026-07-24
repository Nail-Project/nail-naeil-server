import { AppError } from '../../common/errors/app.error';

export class InvalidShopSyncRequestError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INVALID_SHOP_SYNC_REQUEST',
      statusCode: 400,
      message: '네일샵 동기화 요청을 확인해주세요.',
      data,
    });
  }
}

export class ShopDataProviderError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'SHOP_DATA_PROVIDER_ERROR',
      statusCode: 502,
      message: '소상공인 상가 정보를 불러오지 못했어요.',
      data,
    });
  }
}

export class UnauthorizedShopSyncError extends AppError {
  constructor() {
    super({
      code: 'UNAUTHORIZED_SHOP_SYNC',
      statusCode: 401,
      message: '네일샵 동기화 권한이 없어요.',
    });
  }
}
