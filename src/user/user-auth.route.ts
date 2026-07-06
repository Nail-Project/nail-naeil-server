import { Router } from 'express';
import { UserAuthController } from './user-auth.controller';

const router = Router();
const controller = new UserAuthController();

router.post('/signup', controller.signup);
router.post('/login', controller.login);

export default router;