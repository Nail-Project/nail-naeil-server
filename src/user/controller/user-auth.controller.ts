import { Request, Response, NextFunction } from 'express';
import { UserAuthService } from '../service/user-auth.service';
import { SignupUserRequestSchema } from '../dto/signup-user-request';
import { LoginUserRequestSchema } from '../dto/login-user-request';
import { TokenRequestSchema } from '../dto/token-request';
import { UserValidationError } from '../error/user.error';
import { success } from '../../common/responses/api-response';

export class UserAuthController {
  private readonly userAuthService = new UserAuthService();

  /**
   * @openapi
   * /api/v1/users/signup:
   *   post:
   *     summary: 회원가입
   *     tags:
   *       - User Auth
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [loginId, password, email, phoneNumber]
   *             properties:
   *               loginId:
   *                 type: string
   *                 example: test01
   *               password:
   *                 type: string
   *                 example: pass1234
   *               email:
   *                 type: string
   *                 example: test@test.com
   *               phoneNumber:
   *                 type: string
   *                 example: "01012345678"
   *     responses:
   *       201:
   *         description: 회원가입 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 resultType:
   *                   type: string
   *                   example: SUCCESS
   *                 error:
   *                   type: object
   *                   nullable: true
   *                   example: null
   *                 success:
   *                   type: object
   *                   properties:
   *                     userId:
   *                       type: integer
   *                       example: 1
   *                     loginId:
   *                       type: string
   *                       example: test01
   *                     email:
   *                       type: string
   *                       example: test@test.com
   *                     role:
   *                       type: string
   *                       example: CUSTOMER
   *       409:
   *         description: 아이디 또는 이메일 중복
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiErrorResponse'
   *             examples:
   *               duplicatedLoginId:
   *                 value: { resultType: FAIL, error: { code: DUPLICATED_LOGIN_ID, message: 이미 사용 중인 아이디입니다., data: null }, success: null }
   *               duplicatedEmail:
   *                 value: { resultType: FAIL, error: { code: DUPLICATED_EMAIL, message: 이미 사용 중인 이메일입니다., data: null }, success: null }
   *       400:
   *         description: 회원가입 입력값 검증 실패
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiErrorResponse'
   *             example: { resultType: FAIL, error: { code: USER_VALIDATION_FAILED, message: 입력 정보를 다시 확인해주세요., data: null }, success: null }
   */
  signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = SignupUserRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new UserValidationError(parsed.error.flatten());
      }

      const result = await this.userAuthService.signup(parsed.data);
      res.status(201).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @openapi
   * /api/v1/users/login:
   *   post:
   *     summary: 로그인
   *     tags:
   *       - User Auth
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [identifier, password]
   *             properties:
   *               identifier:
   *                 type: string
   *                 description: 아이디 또는 이메일
   *                 example: test01
   *               password:
   *                 type: string
   *                 example: pass1234
   *     responses:
   *       200:
   *         description: 로그인 성공, accessToken/refreshToken 발급
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 resultType:
   *                   type: string
   *                   example: SUCCESS
   *                 error:
   *                   type: object
   *                   nullable: true
   *                   example: null
   *                 success:
   *                   type: object
   *                   properties:
   *                     accessToken:
   *                       type: string
   *                     refreshToken:
   *                       type: string
   *       401:
   *         description: 아이디 또는 비밀번호 불일치
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiErrorResponse'
   *             example: { resultType: FAIL, error: { code: INVALID_CREDENTIALS, message: 아이디 또는 비밀번호가 올바르지 않습니다., data: null }, success: null }
   *       400:
   *         description: 로그인 입력값 검증 실패
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiErrorResponse'
   *             example: { resultType: FAIL, error: { code: USER_VALIDATION_FAILED, message: 입력 정보를 다시 확인해주세요., data: null }, success: null }
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = LoginUserRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new UserValidationError(parsed.error.flatten());
      }

      const result = await this.userAuthService.login(parsed.data);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @openapi
   * /api/v1/users/auth/refresh:
   *   post:
   *     summary: 액세스 토큰 재발급
   *     tags:
   *       - User Auth
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: 재발급 성공, 새 accessToken/refreshToken 발급
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 resultType:
   *                   type: string
   *                   example: SUCCESS
   *                 error:
   *                   type: object
   *                   nullable: true
   *                   example: null
   *                 success:
   *                   type: object
   *                   properties:
   *                     accessToken:
   *                       type: string
   *                     refreshToken:
   *                       type: string
   *       401:
   *         description: 유효하지 않은 토큰
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiErrorResponse'
   *             example: { resultType: FAIL, error: { code: INVALID_TOKEN, message: 유효하지 않은 토큰입니다., data: null }, success: null }
   *       400:
   *         description: 토큰 요청값 검증 실패
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiErrorResponse'
   *             example: { resultType: FAIL, error: { code: USER_VALIDATION_FAILED, message: 입력 정보를 다시 확인해주세요., data: null }, success: null }
   */
  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = TokenRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new UserValidationError(parsed.error.flatten());
      }

      const result = await this.userAuthService.refresh(parsed.data.refreshToken);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @openapi
   * /api/v1/users/auth/logout:
   *   post:
   *     summary: 로그아웃 (refresh token 폐기)
   *     tags:
   *       - User Auth
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       204:
   *         description: 로그아웃 성공
   *       400:
   *         description: 토큰 요청값 검증 실패
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiErrorResponse'
   *             example: { resultType: FAIL, error: { code: USER_VALIDATION_FAILED, message: 입력 정보를 다시 확인해주세요., data: null }, success: null }
   *       401:
   *         description: 유효하지 않은 토큰
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiErrorResponse'
   *             example: { resultType: FAIL, error: { code: INVALID_TOKEN, message: 유효하지 않은 토큰입니다., data: null }, success: null }
   */
  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = TokenRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new UserValidationError(parsed.error.flatten());
      }

      await this.userAuthService.logout(parsed.data.refreshToken);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
