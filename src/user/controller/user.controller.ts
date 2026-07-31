import { Request, Response, NextFunction } from 'express';
import { UserService } from '../service/user.service';
import { UpdateUserRequestSchema } from '../dto/update-user-request';
import { UserValidationError } from '../error/user.error';
import { success } from '../../common/responses/api-response';

export class UserController {
  private readonly userService = new UserService();

  /**
   * @openapi
   * /api/users/me:
   *   get:
   *     summary: 마이페이지 조회
   *     tags:
   *       - User
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 내 정보 조회 성공
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
   *                     email:
   *                       type: string
   *                       nullable: true
   *                       example: test@test.com
   *                     phoneNumber:
   *                       type: string
   *                       nullable: true
   *                       example: "01012345678"
   *                     nickname:
   *                       type: string
   *                       nullable: true
   *                       example: 홍길동
   *                     role:
   *                       type: string
   *                       example: CUSTOMER
   *       401:
   *         description: 유효하지 않은 토큰
   *       404:
   *         description: 사용자를 찾을 수 없음
   */
  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.userService.getMyProfile(req.userId!);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @openapi
   * /api/users/me:
   *   patch:
   *     summary: 회원정보 수정
   *     tags:
   *       - User
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               nickname:
   *                 type: string
   *                 example: 홍길동
   *               phoneNumber:
   *                 type: string
   *                 example: "01012345678"
   *               email:
   *                 type: string
   *                 example: new@test.com
   *     responses:
   *       200:
   *         description: 수정 성공, 갱신된 내 정보 반환
   *       400:
   *         description: 입력값 검증 실패
   *       401:
   *         description: 유효하지 않은 토큰
   *       404:
   *         description: 사용자를 찾을 수 없음
   *       409:
   *         description: 이미 사용 중인 이메일
   */
  updateMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = UpdateUserRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new UserValidationError(parsed.error.flatten());
      }

      const result = await this.userService.updateMyProfile(req.userId!, parsed.data);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * @openapi
   * /api/users/me:
   *   delete:
   *     summary: 회원 탈퇴
   *     tags:
   *       - User
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       204:
   *         description: 탈퇴 성공
   *       401:
   *         description: 유효하지 않은 토큰
   *       404:
   *         description: 사용자를 찾을 수 없음
   */
  deleteMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.userService.deleteAccount(req.userId!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
