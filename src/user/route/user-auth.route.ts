import { Router } from 'express';
import { UserAuthController } from '../controller/user-auth.controller';

const router = Router();
const controller = new UserAuthController();

router.post('/signup', controller.signup);
router.post('/login', controller.login);
router.post('/auth/refresh', controller.refresh);
router.post('/auth/logout', controller.logout);

export default router;