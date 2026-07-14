import { AppError } from './app-error';

export const DuplicatedLoginIdError = () =>
  new AppError('DUPLICATED_LOGIN_ID', 409, '이미 사용 중인 아이디입니다.');

export const DuplicatedEmailError = () =>
  new AppError('DUPLICATED_EMAIL', 409, '이미 사용 중인 이메일입니다.');

// 로그인 실패는 아이디/비번 구분 없이 하나로 응답 (계정 존재 여부 노출 방지)
export const InvalidCredentialsError = () =>
  new AppError('INVALID_CREDENTIALS', 401, '아이디 또는 비밀번호가 올바르지 않습니다.');

export const InvalidTokenError = () =>
  new AppError('INVALID_TOKEN', 401, '유효하지 않은 토큰입니다.');