import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../service/notification.service';
import { GetNotificationsRequest } from '../dto/get-notifications-request';
import {
  InvalidNotificationIdError,
  InvalidNotificationRequestError,
} from '../error/notification.error';
import { success } from '../../common/responses/api-response';

export class NotificationController {
  private readonly notificationService = new NotificationService();

  /**
   * @openapi
   * /api/v1/notifications:
   *   get:
   *     summary: 내 알림 목록 조회
   *     tags:
   *       - Notification
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: unread
   *         schema:
   *           type: boolean
   *         description: true면 안읽은 알림만 조회
   *       - in: query
   *         name: cursor
   *         schema:
   *           type: string
   *         description: 다음 페이지 조회용 커서(이전 응답의 nextCursor). 첫 페이지는 생략.
   *       - in: query
   *         name: size
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: 알림 목록 조회 성공
   *       400:
   *         description: 유효하지 않은 쿼리 값
   *       401:
   *         description: 유효하지 않은 토큰
   */
  getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = GetNotificationsRequest.safeParse(req.query);
      if (!parsed.success) {
        throw new InvalidNotificationRequestError(parsed.error.flatten());
      }

      const result = await this.notificationService.getMyNotifications(req.userId!, parsed.data);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @openapi
   * /api/v1/notifications/{notificationId}/read:
   *   patch:
   *     summary: 알림 단건 읽음 처리
   *     tags:
   *       - Notification
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: notificationId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: 읽음 처리 성공
   *       400:
   *         description: 유효하지 않은 알림 id
   *       401:
   *         description: 유효하지 않은 토큰
   *       404:
   *         description: 알림을 찾을 수 없음
   */
  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notificationId = Number(req.params.notificationId);
      if (!Number.isInteger(notificationId) || notificationId <= 0) {
        throw new InvalidNotificationIdError();
      }

      await this.notificationService.markAsRead(req.userId!, notificationId);
      res.status(200).json(success({ notificationId, isRead: true }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @openapi
   * /api/v1/notifications/read-all:
   *   patch:
   *     summary: 내 알림 전체 읽음 처리
   *     tags:
   *       - Notification
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 전체 읽음 처리 성공(처리 건수 반환)
   *       401:
   *         description: 유효하지 않은 토큰
   */
  markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.notificationService.markAllAsRead(req.userId!);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };
}
