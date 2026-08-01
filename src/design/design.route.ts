import { Router } from 'express';
import { DesignController } from './controller/design.controller';
import { PrismaDesignRepository } from './repository/design.repository';
import { DesignService } from './service/design.service';
import { authMiddleware } from '../common/middlewares/auth.middleware';

// TODO: [malibu] Notion API 스펙 문서의 디자인 섹션이 실제 응답 형식과 다름
// (isSuccess/code(숫자)/data → resultType/error/success 등, 예약 도메인 B6과 동일 사안).
// 코드 변경 아님 — Notion 문서만 수정하면 됨.
const repository = new PrismaDesignRepository();
const service = new DesignService(repository);
const controller = new DesignController(service);
const designRouter = Router();

/**
 * @openapi
 * /api/v1/designs:
 *   get:
 *     summary: 디자인 피드 조회
 *     tags:
 *       - Design
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: 이전 응답의 pageInfo.nextCursor 값. 첫 페이지는 생략한다.
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: 디자인 피드 조회 성공
 *       400:
 *         description: 유효하지 않은 쿼리 값
 *       500:
 *         description: 서버 오류
 */
/**
 * @openapi
 * /api/v1/designs/{designId}:
 *   get:
 *     summary: 디자인 상세 조회
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Design
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 디자인 상세 조회 성공
 *       400:
 *         description: 유효하지 않은 디자인 id
 *       404:
 *         description: 존재하지 않는 디자인
 *       500:
 *         description: 서버 오류
 */
const registerRoutes = (router: Router, routeController: DesignController): Router => {
  router.get('/', routeController.getDesigns);
  router.get('/:designId', authMiddleware, routeController.getDesignDetail);

  return router;
};

registerRoutes(designRouter, controller);

export default designRouter;

export const createDesignRouter = (designService: DesignService): Router => {
  const injectedController = new DesignController(designService);

  return registerRoutes(Router(), injectedController);
};
