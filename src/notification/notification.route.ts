import { Router } from 'express';
import { NotificationController } from './controller/notification.controller';
import { authenticate } from '../user/middlewares/user-auth.middleware';

const router = Router();
const controller = new NotificationController();

router.get('/', authenticate, controller.getNotifications);
router.patch('/read-all', authenticate, controller.markAllAsRead);
router.patch('/:notificationId/read', authenticate, controller.markAsRead);

export default router;
