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
 *         name: category
 *         schema:
 *           type: string
 *         description: 태그 이름으로 필터링(카테고리 탭). 생략하면 전체 조회.
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
 * /api/v1/designs/wishlist:
 *   get:
 *     summary: 내가 찜한 디자인 목록 조회
 *     security:
 *       - bearerAuth: []
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
 *         description: 찜한 디자인 목록 조회 성공
 *       400:
 *         description: 유효하지 않은 쿼리 값
 *       401:
 *         description: 인증 실패
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
/**
 * @openapi
 * /api/v1/designs/{designId}/wish:
 *   post:
 *     summary: 디자인 찜 생성
 *     description: 이미 찜한 디자인을 다시 요청해도 에러 없이 성공(200)으로 멱등하게 처리한다.
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
 *         description: 찜 생성 성공(이미 찜한 경우 포함)
 *       400:
 *         description: 유효하지 않은 디자인 id
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 존재하지 않는 디자인
 *       500:
 *         description: 서버 오류
 *   delete:
 *     summary: 디자인 찜 삭제
 *     description: 찜하지 않은 디자인을 삭제 요청해도 에러 없이 성공(200)으로 멱등하게 처리한다.
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
 *         description: 찜 삭제 성공(이미 찜 안 한 경우 포함)
 *       400:
 *         description: 유효하지 않은 디자인 id
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 존재하지 않는 디자인
 *       500:
 *         description: 서버 오류
 */
const registerRoutes = (router: Router, routeController: DesignController): Router => {
  router.get('/', routeController.getDesigns);
  // 정적 경로(/wishlist)는 반드시 동적 경로(/:designId)보다 먼저 등록한다 -
  // 등록 순서상 뒤에 두면 GET /wishlist 요청이 /:designId에 먼저 매칭되어
  // "wishlist"를 디자인 id로 파싱하려다 실패(400)한다.
  router.get('/wishlist', authMiddleware, routeController.getWishlist);
  router.get('/:designId', authMiddleware, routeController.getDesignDetail);
  router.post('/:designId/wish', authMiddleware, routeController.createWish);
  router.delete('/:designId/wish', authMiddleware, routeController.deleteWish);

  return router;
};

registerRoutes(designRouter, controller);

export default designRouter;

export const createDesignRouter = (designService: DesignService): Router => {
  const injectedController = new DesignController(designService);

  return registerRoutes(Router(), injectedController);
};
