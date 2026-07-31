import { AppError } from '../../common/errors/app.error';

// GET /designs - 유효하지 않은 page/size 쿼리 값
export class InvalidDesignRequestError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INVALID_DESIGN_REQUEST',
      statusCode: 400,
      message: '유효하지 않은 요청입니다.',
      data,
    });
  }
}

// GET /designs/:designId - 유효하지 않은 디자인 id (path variable)
export class InvalidDesignIdError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INVALID_DESIGN_ID',
      statusCode: 400,
      message: '유효하지 않은 디자인 id입니다.',
      data,
    });
  }
}

// GET /designs/:designId - 존재하지 않는 디자인
export class DesignNotFoundError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'DESIGN_NOT_FOUND',
      statusCode: 404,
      message: '존재하지 않는 정보입니다.',
      data,
    });
  }
}
