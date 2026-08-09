import { Request, Response, NextFunction } from 'express';
import { NotificationSettingService } from '../service/notification-setting.service';
import { UpdateNotificationSettingsRequest } from '../dto/update-notification-settings-request';
import { InvalidNotificationSettingRequestError } from '../error/notification.error';
import { success } from '../../common/responses/api-response';

export class NotificationSettingController {
  constructor(private readonly notificationSettingService = new NotificationSettingService()) {}

  /**
   * @openapi
   * /api/v1/notifications/settings:
   *   get:
   *     summary: 내 알림 수신 설정 조회
   *     description: 아직 설정한 적이 없으면 기본값(모두 ON)을 반환한다.
   *     tags:
   *       - Notification
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 알림 설정 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 resultType:
   *                   type: string
   *                   example: SUCCESS
   *                 error:
   *                   type: object
   *                   nullable: true
   *                   example: null
   *                 success:
   *                   type: object
   *                   properties:
   *                     estimateEnabled:
   *                       type: boolean
   *                       description: 견적 알림 수신 여부
   *                       example: true
   *                     reservationEnabled:
   *                       type: boolean
   *                       description: 예약 알림 수신 여부
   *                       example: true
   *                     marketingEnabled:
   *                       type: boolean
   *                       description: 마케팅 알림 수신 여부
   *                       example: true
   *       401:
   *         description: 유효하지 않은 토큰
   */
  getSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.notificationSettingService.getSettings(req.userId!);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @openapi
   * /api/v1/notifications/settings:
   *   patch:
   *     summary: 내 알림 수신 설정 수정
   *     description: 견적/예약/마케팅 알림 각각을 ON·OFF 한다. 전달한 항목만 갱신된다(부분 수정).
   *     tags:
   *       - Notification
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               estimateEnabled:
   *                 type: boolean
   *                 example: false
   *               reservationEnabled:
   *                 type: boolean
   *                 example: true
   *               marketingEnabled:
   *                 type: boolean
   *                 example: false
   *     responses:
   *       200:
   *         description: 수정 성공, 갱신된 설정 반환
   *       400:
   *         description: 유효하지 않은 설정 값
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiErrorResponse'
   *             example: { resultType: FAIL, error: { code: INVALID_NOTIFICATION_SETTING_REQUEST, message: 유효하지 않은 요청입니다., data: null }, success: null }
   *       401:
   *         description: 유효하지 않은 토큰
   */
  updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = UpdateNotificationSettingsRequest.safeParse(req.body);
      if (!parsed.success) {
        throw new InvalidNotificationSettingRequestError(parsed.error.flatten());
      }

      const result = await this.notificationSettingService.updateSettings(req.userId!, parsed.data);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };
}
