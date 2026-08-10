import { Router } from 'express';
import { NotificationController } from './controller/notification.controller';
import { NotificationService } from './service/notification.service';
import { authMiddleware as authenticate } from '../common/middlewares/auth.middleware';

const service = new NotificationService();
const controller = new NotificationController(service);
const notificationRouter = Router();

// 라우트 등록을 헬퍼로 분리해 운영용 라우터와 테스트용(주입) 라우터가 동일한 경로/미들웨어를 공유한다.
const registerRoutes = (router: Router, routeController: NotificationController): Router => {
  router.get('/', authenticate, routeController.getNotifications);
  router.patch('/read-all', authenticate, routeController.markAllAsRead);
  router.patch('/:notificationId/read', authenticate, routeController.markAsRead);

  return router;
};

registerRoutes(notificationRouter, controller);

export default notificationRouter;

// 테스트에서 fake NotificationService를 주입해 라우트를 구성할 수 있도록 팩토리를 제공한다.
export const createNotificationRouter = (notificationService: NotificationService): Router => {
  const injectedController = new NotificationController(notificationService);

  return registerRoutes(Router(), injectedController);
};
