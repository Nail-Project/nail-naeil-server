import { Request, Response, NextFunction } from 'express';
import { UserAuthService } from '../service/user-auth.service';
import { SignupUserRequest } from '../dto/signup-user-request';
import { LoginUserRequest } from '../dto/login-user-request';

export class UserAuthController {
  private readonly userAuthService = new UserAuthService();

  /**
   * @openapi
   * /api/users/signup:
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
   *                 userId:
   *                   type: integer
   *                   example: 1
   *                 loginId:
   *                   type: string
   *                   example: test01
   *                 email:
   *                   type: string
   *                   example: test@test.com
   *                 role:
   *                   type: string
   *                   example: CUSTOMER
   *       409:
   *         description: 아이디 또는 이메일 중복
   */
  signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.userAuthService.signup(req.body as SignupUserRequest);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @openapi
   * /api/users/login:
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
   *                 accessToken:
   *                   type: string
   *                 refreshToken:
   *                   type: string
   *       401:
   *         description: 아이디 또는 비밀번호 불일치
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.userAuthService.login(req.body as LoginUserRequest);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @openapi
   * /api/users/auth/refresh:
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
   *                 accessToken:
   *                   type: string
   *                 refreshToken:
   *                   type: string
   *       401:
   *         description: 유효하지 않은 토큰
   */
  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body as { refreshToken: string };
      const result = await this.userAuthService.refresh(refreshToken);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @openapi
   * /api/users/auth/logout:
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
   */
  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body as { refreshToken: string };
      await this.userAuthService.logout(refreshToken);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}