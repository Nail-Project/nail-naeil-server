import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { UserAddressController } from '../controller/user-address.controller';
import type { UserAddressService } from '../service/user-address.service';

export const createUserAddressRouter = (service?: UserAddressService) => {
  const router = Router();
  const controller = new UserAddressController(service);

  /**
   * @openapi
   * /api/v1/users/me/addresses:
   *   get:
   *     summary: 내 주소 목록 조회
   *     tags: [User Address]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: 주소 목록 조회 성공
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/UserAddressListSuccessResponse' }
   *       401: { $ref: '#/components/responses/AuthenticationRequiredResponse' }
   *   post:
   *     summary: 내 주소 추가
   *     description: 첫 번째 주소는 isDefault 값과 관계없이 기본 주소로 등록된다.
   *     tags: [User Address]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/UserAddressRequest' }
   *     responses:
   *       201:
   *         description: 주소 추가 성공
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/UserAddressSuccessResponse' }
   *       400: { $ref: '#/components/responses/InvalidUserAddressResponse' }
   *       401: { $ref: '#/components/responses/AuthenticationRequiredResponse' }
   * /api/v1/users/me/addresses/{addressId}:
   *   patch:
   *     summary: 내 주소 수정
   *     tags: [User Address]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: addressId
   *         required: true
   *         schema: { type: integer }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/UserAddressUpdateRequest' }
   *     responses:
   *       200:
   *         description: 주소 수정 성공
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/UserAddressSuccessResponse' }
   *       400: { $ref: '#/components/responses/InvalidUserAddressResponse' }
   *       401: { $ref: '#/components/responses/AuthenticationRequiredResponse' }
   *       404: { $ref: '#/components/responses/UserAddressNotFoundResponse' }
   *   delete:
   *     summary: 내 주소 삭제
   *     description: 기본 주소를 삭제하면 남은 주소 중 가장 먼저 등록한 주소가 기본 주소가 된다.
   *     tags: [User Address]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: addressId
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: 주소 삭제 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 resultType: { type: string, example: SUCCESS }
   *                 error: { nullable: true, example: null }
   *                 success:
   *                   type: object
   *                   properties:
   *                     addressId: { type: integer, example: 1 }
   *       400: { $ref: '#/components/responses/InvalidUserAddressResponse' }
   *       401: { $ref: '#/components/responses/AuthenticationRequiredResponse' }
   *       404: { $ref: '#/components/responses/UserAddressNotFoundResponse' }
   */
  router.get('/', authMiddleware, controller.getAddresses);
  router.post('/', authMiddleware, controller.createAddress);
  router.patch('/:addressId', authMiddleware, controller.updateAddress);
  router.delete('/:addressId', authMiddleware, controller.deleteAddress);

  return router;
};

export default createUserAddressRouter();
