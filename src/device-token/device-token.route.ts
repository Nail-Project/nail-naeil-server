import { Router } from 'express';
import { DeviceTokenController } from './controller/device-token.controller';
import { DeviceTokenService } from './service/device-token.service';
import { authMiddleware as authenticate } from '../common/middlewares/auth.middleware';

const service = new DeviceTokenService();
const controller = new DeviceTokenController(service);
const deviceTokenRouter = Router();

// 라우트 등록을 헬퍼로 분리해 운영용 라우터와 테스트용(주입) 라우터가 동일한 경로/미들웨어를 공유한다.
const registerRoutes = (router: Router, routeController: DeviceTokenController): Router => {
  router.post('/', authenticate, routeController.register);
  router.delete('/', authenticate, routeController.unregister);

  return router;
};

registerRoutes(deviceTokenRouter, controller);

export default deviceTokenRouter;

// 테스트에서 fake DeviceTokenService를 주입해 라우트를 구성할 수 있도록 팩토리를 제공한다.
export const createDeviceTokenRouter = (deviceTokenService: DeviceTokenService): Router => {
  const injectedController = new DeviceTokenController(deviceTokenService);

  return registerRoutes(Router(), injectedController);
};
