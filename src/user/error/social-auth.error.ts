import { AppError } from '../../common/errors/app.error';

// state 불일치/누락 등 OAuth 콜백 검증 실패 (CSRF 방지)
export class InvalidOAuthStateError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INVALID_OAUTH_STATE',
      statusCode: 400,
      message: '유효하지 않은 요청입니다. 다시 시도해주세요.',
      data,
    });
  }
}

// 지원하지 않는 소셜 provider
export class UnsupportedProviderError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'UNSUPPORTED_PROVIDER',
      statusCode: 400,
      message: '지원하지 않는 소셜 로그인입니다.',
      data,
    });
  }
}

// 소셜 서버에서 토큰 교환 실패
export class SocialTokenExchangeError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'SOCIAL_TOKEN_EXCHANGE_FAILED',
      statusCode: 502,
      message: '소셜 로그인 처리 중 오류가 발생했습니다.',
      data,
    });
  }
}

// 소셜 서버에서 프로필 조회 실패
export class SocialProfileError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'SOCIAL_PROFILE_FETCH_FAILED',
      statusCode: 502,
      message: '소셜 로그인 처리 중 오류가 발생했습니다.',
      data,
    });
  }
}
