import { Router } from 'express';
import { SocialAuthController } from '../controller/social-auth.controller';

const router = Router();
const controller = new SocialAuthController();

// 백엔드 주도 OAuth: 시작(리다이렉트) → 콜백(토큰 발급 후 앱 딥링크)
router.get('/kakao', controller.start('kakao'));
router.get('/kakao/callback', controller.callback('kakao'));
router.get('/naver', controller.start('naver'));
router.get('/naver/callback', controller.callback('naver'));

export default router;
