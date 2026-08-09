import { Router } from 'express';
import { NotificationSettingController } from './controller/notification-setting.controller';
import { NotificationSettingService } from './service/notification-setting.service';
import { authenticate } from '../user/middlewares/user-auth.middleware';

const service = new NotificationSettingService();
const controller = new NotificationSettingController(service);
const notificationSettingRouter = Router();

// 라우트 등록을 헬퍼로 분리해 운영용 라우터와 테스트용(주입) 라우터가 동일한 경로/미들웨어를 공유한다.
// `/notifications`에 알림 목록 라우터와 함께 마운트되며, 정적 경로 `/settings`라 `/:notificationId`와 충돌하지 않는다.
const registerRoutes = (router: Router, routeController: NotificationSettingController): Router => {
  router.get('/settings', authenticate, routeController.getSettings);
  router.patch('/settings', authenticate, routeController.updateSettings);

  return router;
};

registerRoutes(notificationSettingRouter, controller);

export default notificationSettingRouter;

// 테스트에서 fake NotificationSettingService를 주입해 라우트를 구성할 수 있도록 팩토리를 제공한다.
export const createNotificationSettingRouter = (
  settingService: NotificationSettingService,
): Router => {
  const injectedController = new NotificationSettingController(settingService);

  return registerRoutes(Router(), injectedController);
};
