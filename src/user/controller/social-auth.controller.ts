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
        path: '/',
      });
      res.redirect(this.socialAuthService.getAuthorizationUrl(provider, state));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @openapi
   * /api/auth/{provider}/callback:
   *   get:
   *     summary: 소셜 로그인 콜백 (토큰 발급 후 로그인 완료 페이지로 리다이렉트)
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
   *         description: 로그인 완료 페이지(/api/auth/complete, accessToken/refreshToken 포함)로 리다이렉트
   *         headers:
   *           Location:
   *             description: 로그인 성공 토큰을 쿼리 파라미터로 전달하는 완료 페이지 경로
   *             schema:
   *               type: string
   *               format: uri
   *               example: /api/auth/complete?accessToken=eyJhbGciOiJIUzI1NiJ9...&refreshToken=eyJhbGciOiJIUzI1NiJ9...
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
        const tokens = await this.socialAuthService.handleCallback(provider, code, state);

        res.clearCookie(STATE_COOKIE, { path: '/' });
        const completeUrl = new URL('/api/auth/complete', `${req.protocol}://${req.get('host')}`);
        completeUrl.searchParams.set('accessToken', tokens.accessToken);
        completeUrl.searchParams.set('refreshToken', tokens.refreshToken);
        res.redirect(completeUrl.pathname + completeUrl.search);
      } catch (error) {
        next(error);
      }
    };

  /**
   * @openapi
   * /api/auth/complete:
   *   get:
   *     summary: 소셜 로그인 완료 후 앱 딥링크 전환 페이지
   *     description: |
   *       콜백에서 커스텀 스킴(nailnaeil://)으로 바로 리다이렉트하지 않고 이 https 페이지를 거친다.
   *       앱이 없는 환경(브라우저)에서 커스텀 스킴 이동이 조용히 취소되면서 이전 페이지(카카오 로그인 화면)가
   *       언로드되지 않아 재시도 로직이 중복 발동하는 문제를 막기 위함이다.
   *     tags:
   *       - User Auth
   *     parameters:
   *       - in: query
   *         name: accessToken
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: refreshToken
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: 앱 딥링크로 전환을 시도하는 HTML 페이지
   *       400:
   *         description: accessToken/refreshToken 누락
   */
  completeLanding = (req: Request, res: Response) => {
    const accessToken = typeof req.query.accessToken === 'string' ? req.query.accessToken : '';
    const refreshToken = typeof req.query.refreshToken === 'string' ? req.query.refreshToken : '';

    if (!accessToken || !refreshToken) {
      res.status(400).send('잘못된 요청입니다.');
      return;
    }

    const deeplink = new URL(process.env.APP_AUTH_DEEPLINK ?? DEFAULT_DEEPLINK);
    deeplink.searchParams.set('accessToken', accessToken);
    deeplink.searchParams.set('refreshToken', refreshToken);
    const deeplinkUrl = deeplink.toString();

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>로그인 완료</title>
</head>
<body>
<p>로그인이 완료되었습니다. 앱으로 이동합니다.</p>
<p><a id="open-app" href="${this.escapeHtmlAttribute(deeplinkUrl)}">앱으로 돌아가기</a></p>
<script>
  (function () {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    window.location.replace(${JSON.stringify(deeplinkUrl)});
  })();
</script>
</body>
</html>`);
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

  private escapeHtmlAttribute(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
