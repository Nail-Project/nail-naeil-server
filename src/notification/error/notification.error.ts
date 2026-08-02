import { AppError } from '../../common/errors/app.error';

// GET /api/notifications - 유효하지 않은 unread/page/size 쿼리 값
export class InvalidNotificationRequestError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INVALID_NOTIFICATION_REQUEST',
      statusCode: 400,
      message: '유효하지 않은 요청입니다.',
      data,
    });
  }
}

// PATCH /api/notifications/:notificationId/read - 유효하지 않은 알림 id (path variable)
export class InvalidNotificationIdError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INVALID_NOTIFICATION_ID',
      statusCode: 400,
      message: '유효하지 않은 알림 id입니다.',
      data,
    });
  }
}

// 존재하지 않거나 본인 소유가 아닌 알림 접근.
// 소유권 없음을 404로 통일해 다른 사용자의 알림 존재 여부를 노출하지 않는다.
export class NotificationNotFoundError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'NOTIFICATION_NOT_FOUND',
      statusCode: 404,
      message: '알림을 찾을 수 없습니다.',
      data,
    });
  }
}
