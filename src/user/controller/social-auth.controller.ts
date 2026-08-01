import { Request, Response, NextFunction } from 'express';
import { SocialAuthService, SocialProviderKey } from '../service/social-auth.service';
import { InvalidOAuthStateError } from '../error/social-auth.error';

const STATE_COOKIE = 'oauth_state';
const STATE_COOKIE_MAX_AGE_MS = 5 * 60 * 1000;
const DEFAULT_DEEPLINK = 'nailnaeil://auth';

export class SocialAuthController {
  private readonly socialAuthService = new SocialAuthService();

  /**
   * @openapi
   * /api/v1/auth/{provider}:
   *   get:
   *     summary: 소셜 로그인 시작 (카카오/네이버 인가 페이지로 리다이렉트)
   *     tags:
   *       - User Auth
   *     parameters:
   *       - in: path
   *         name: provider
   *         required: true
   *         schema:
   *           type: string
   *           enum: [kakao, naver]
   *     responses:
   *       302:
   *         description: 소셜 인가 페이지로 리다이렉트
   *       400:
   *         description: 지원하지 않는 소셜 로그인 제공자
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
   *             example: { resultType: FAIL, error: { code: UNSUPPORTED_PROVIDER, message: 지원하지 않는 소셜 로그인입니다., data: null }, success: null }
   */
  start = (provider: SocialProviderKey) => (_req: Request, res: Response, next: NextFunction) => {
    try {
      const state = this.socialAuthService.generateState();
      res.cookie(STATE_COOKIE, state, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: STATE_COOKIE_MAX_AGE_MS,
      });
      res.redirect(this.socialAuthService.getAuthorizationUrl(provider, state));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @openapi
   * /api/v1/auth/{provider}/callback:
   *   get:
   *     summary: 소셜 로그인 콜백 (토큰 발급 후 앱 딥링크로 리다이렉트)
   *     tags:
   *       - User Auth
   *     parameters:
   *       - in: path
   *         name: provider
   *         required: true
   *         schema:
   *           type: string
   *           enum: [kakao, naver]
   *       - in: query
   *         name: code
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: state
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       302:
   *         description: 앱 딥링크(accessToken/refreshToken 포함)로 리다이렉트
   *       400:
   *         description: OAuth 요청 검증 실패
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
   *             examples:
   *               invalidState:
   *                 value: { resultType: FAIL, error: { code: INVALID_OAUTH_STATE, message: 유효하지 않은 요청입니다. 다시 시도해주세요., data: null }, success: null }
   *               unsupportedProvider:
   *                 value: { resultType: FAIL, error: { code: UNSUPPORTED_PROVIDER, message: 지원하지 않는 소셜 로그인입니다., data: null }, success: null }
   *       502:
   *         description: 소셜 로그인 제공자 연동 실패
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
   *             examples:
   *               tokenExchangeFailed:
   *                 value: { resultType: FAIL, error: { code: SOCIAL_TOKEN_EXCHANGE_FAILED, message: 소셜 로그인 처리 중 오류가 발생했습니다., data: null }, success: null }
   *               profileFetchFailed:
   *                 value: { resultType: FAIL, error: { code: SOCIAL_PROFILE_FETCH_FAILED, message: 소셜 로그인 처리 중 오류가 발생했습니다., data: null }, success: null }
   */
  callback =
    (provider: SocialProviderKey) => async (req: Request, res: Response, next: NextFunction) => {
      try {
        const code = typeof req.query.code === 'string' ? req.query.code : '';
        const state = typeof req.query.state === 'string' ? req.query.state : '';
        const savedState = this.readStateCookie(req);

        if (!code || !state || !savedState || state !== savedState) {
          throw new InvalidOAuthStateError();
        }
        res.clearCookie(STATE_COOKIE);

        const tokens = await this.socialAuthService.handleCallback(provider, code, state);

        const deeplink = new URL(process.env.APP_AUTH_DEEPLINK ?? DEFAULT_DEEPLINK);
        deeplink.searchParams.set('accessToken', tokens.accessToken);
        deeplink.searchParams.set('refreshToken', tokens.refreshToken);
        res.redirect(deeplink.toString());
      } catch (error) {
        next(error);
      }
    };

  // cookie-parser 없이 요청 헤더에서 state 쿠키만 직접 파싱한다.
  private readStateCookie(req: Request): string | null {
    const header = req.headers.cookie;
    if (!header) {
      return null;
    }
    for (const part of header.split(';')) {
      const [key, ...rest] = part.trim().split('=');
      if (key === STATE_COOKIE) {
        return decodeURIComponent(rest.join('='));
      }
    }
    return null;
  }
}
