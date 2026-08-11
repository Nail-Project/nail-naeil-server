import { Router } from 'express';
import { UserController } from '../controller/user.controller';
import { authMiddleware as authenticate } from '../../common/middlewares/auth.middleware';

const router = Router();
const controller = new UserController();

router.get('/me', authenticate, controller.getMe);
router.patch('/me', authenticate, controller.updateMe);
router.delete('/me', authenticate, controller.deleteMe);

export default router;
