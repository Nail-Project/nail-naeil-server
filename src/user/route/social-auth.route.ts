import { Router } from 'express';
import { SocialAuthController } from '../controller/social-auth.controller';

const router = Router();
export const socialAuthCallbackRouter = Router();
const controller = new SocialAuthController();

// 백엔드 주도 OAuth: 시작(리다이렉트) → 콜백(토큰 발급 후 앱 딥링크)
router.get('/kakao', controller.start('kakao'));
router.get('/naver', controller.start('naver'));
socialAuthCallbackRouter.get('/kakao/callback', controller.callback('kakao'));
socialAuthCallbackRouter.get('/naver/callback', controller.callback('naver'));

export default router;
