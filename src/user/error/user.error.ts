import { AppError } from '../../common/errors/app.error';

// zod 검증 실패 시 flatten()된 필드별 에러 메시지를 data에 담아 400으로 응답한다.
export class UserValidationError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'USER_VALIDATION_FAILED',
      statusCode: 400,
      message: '입력 정보를 다시 확인해주세요.',
      data,
    });
  }
}

export class DuplicatedLoginIdError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'DUPLICATED_LOGIN_ID',
      statusCode: 409,
      message: '이미 사용 중인 아이디입니다.',
      data,
    });
  }
}

export class DuplicatedEmailError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'DUPLICATED_EMAIL',
      statusCode: 409,
      message: '이미 사용 중인 이메일입니다.',
      data,
    });
  }
}

// 로그인 실패는 아이디/비번 구분 없이 하나로 응답 (계정 존재 여부 노출 방지)
export class InvalidCredentialsError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INVALID_CREDENTIALS',
      statusCode: 401,
      message: '아이디 또는 비밀번호가 올바르지 않습니다.',
      data,
    });
  }
}

export class InvalidTokenError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INVALID_TOKEN',
      statusCode: 401,
      message: '유효하지 않은 토큰입니다.',
      data,
    });
  }
}
