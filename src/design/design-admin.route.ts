import { Router } from 'express';
import { DesignAdminController } from './controller/design-admin.controller';
import { PrismaDesignRepository } from './repository/design.repository';
import { DesignAdminService } from './service/design-admin.service';
import { designAdminAuth } from './middlewares/design-admin-auth.middleware';

// TODO: [malibu] 관리자 페이지 와이어프레임이 아직 없어서, 현재 Design 스키마 필드를
// 그대로 받는 최소 CRUD로 우선 만들어둠. 와이어프레임이 나오면 필드/흐름 재검토 필요.
const repository = new PrismaDesignRepository();
const service = new DesignAdminService(repository);
const controller = new DesignAdminController(service);
const designAdminRouter = Router();

/**
 * @openapi
 * /admin/api/v1/designs:
 *   post:
 *     summary: 디자인 생성
 *     tags:
 *       - Admin Design
 *     parameters:
 *       - in: header
 *         name: x-admin-design-key
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - imageUrl
 *               - durationMinutes
 *               - difficulty
 *               - recommendedShape
 *               - description
 *             properties:
 *               title: { type: string, maxLength: 100 }
 *               imageUrl: { type: string, maxLength: 255 }
 *               durationMinutes: { type: integer }
 *               difficulty: { type: string, maxLength: 20 }
 *               recommendedShape: { type: string, maxLength: 20 }
 *               description: { type: string }
 *               images:
 *                 type: array
 *                 items: { type: string }
 *                 description: 캐러셀용 추가 이미지 URL 목록
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *                 description: 태그 이름 목록 (없는 이름이면 새로 생성됨)
 *     responses:
 *       201:
 *         description: 디자인 생성 성공
 *       400:
 *         description: 유효하지 않은 요청 값
 *       401:
 *         description: 관리자 인증 실패
 *       500:
 *         description: 서버 오류
 */
/**
 * @openapi
 * /admin/api/v1/designs/{designId}:
 *   patch:
 *     summary: 디자인 수정 (부분 수정)
 *     tags:
 *       - Admin Design
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: integer }
 *       - in: header
 *         name: x-admin-design-key
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: 수정할 필드만 전달한다. images/tags는 전달 시 전체 목록을 대체한다.
 *     responses:
 *       200:
 *         description: 디자인 수정 성공
 *       400:
 *         description: 유효하지 않은 요청 값
 *       401:
 *         description: 관리자 인증 실패
 *       404:
 *         description: 존재하지 않는 디자인
 *       500:
 *         description: 서버 오류
 *   delete:
 *     summary: 디자인 삭제
 *     tags:
 *       - Admin Design
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: integer }
 *       - in: header
 *         name: x-admin-design-key
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: 디자인 삭제 성공
 *       401:
 *         description: 관리자 인증 실패
 *       404:
 *         description: 존재하지 않는 디자인
 *       500:
 *         description: 서버 오류
 */
const registerRoutes = (router: Router, routeController: DesignAdminController): Router => {
  router.post('/', designAdminAuth, routeController.createDesign);
  router.patch('/:designId', designAdminAuth, routeController.updateDesign);
  router.delete('/:designId', designAdminAuth, routeController.deleteDesign);

  return router;
};

registerRoutes(designAdminRouter, controller);

export default designAdminRouter;

export const createDesignAdminRouter = (designAdminService: DesignAdminService): Router => {
  const injectedController = new DesignAdminController(designAdminService);

  return registerRoutes(Router(), injectedController);
};
