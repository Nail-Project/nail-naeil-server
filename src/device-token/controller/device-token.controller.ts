import { Request, Response, NextFunction } from 'express';
import { DeviceTokenService } from '../service/device-token.service';
import {
  RegisterDeviceTokenRequest,
  UnregisterDeviceTokenRequest,
} from '../dto/register-device-token-request';
import { InvalidDeviceTokenRequestError } from '../error/device-token.error';
import { success } from '../../common/responses/api-response';

export class DeviceTokenController {
  constructor(private readonly deviceTokenService = new DeviceTokenService()) {}

  /**
   * @openapi
   * /api/v1/device-tokens:
   *   post:
   *     summary: FCM 디바이스 토큰 등록
   *     description: 앱이 기기에서 발급받은 FCM 토큰을 서버에 등록한다. 같은 토큰 재등록은 멱등하게 처리된다.
   *     tags:
   *       - DeviceToken
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [token]
   *             properties:
   *               token:
   *                 type: string
   *                 description: FCM 등록 토큰
   *               platform:
   *                 type: string
   *                 enum: [ANDROID, IOS]
   *                 default: ANDROID
   *     responses:
   *       200:
   *         description: 등록 성공
   *       400:
   *         description: 유효하지 않은 요청 값
   *       401:
   *         description: 유효하지 않은 토큰
   */
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = RegisterDeviceTokenRequest.safeParse(req.body);
      if (!parsed.success) {
        throw new InvalidDeviceTokenRequestError(parsed.error.flatten());
      }

      await this.deviceTokenService.register(req.userId!, parsed.data);
      res.status(200).json(success({ registered: true }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @openapi
   * /api/v1/device-tokens:
   *   delete:
   *     summary: FCM 디바이스 토큰 해제
   *     description: 로그아웃 등으로 더 이상 발송하지 않을 토큰을 해제한다.
   *     tags:
   *       - DeviceToken
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [token]
   *             properties:
   *               token:
   *                 type: string
   *                 description: 해제할 FCM 등록 토큰
   *     responses:
   *       200:
   *         description: 해제 성공
   *       400:
   *         description: 유효하지 않은 요청 값
   *       401:
   *         description: 유효하지 않은 토큰
   */
  unregister = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = UnregisterDeviceTokenRequest.safeParse(req.body);
      if (!parsed.success) {
        throw new InvalidDeviceTokenRequestError(parsed.error.flatten());
      }

      await this.deviceTokenService.unregister(req.userId!, parsed.data.token);
      res.status(200).json(success({ unregistered: true }));
    } catch (error) {
      next(error);
    }
  };
}
