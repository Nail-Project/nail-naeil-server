import { Router } from 'express';
import { EstimateRequestController } from './controller/estimate-request.controller';
import { EstimateRequestService } from './service/estimate-request.service';
import { authMiddleware } from '../common/middlewares/auth.middleware';

const service = new EstimateRequestService();
const controller = new EstimateRequestController(service);
const estimateRequestRouter = Router();

/**
 * @openapi
 * /api/v1/estimate:
 *   post:
 *     summary: 견적 요청 생성
 *     description: |
 *       사용자가 네일 견적 요청을 생성한다.
 *       이미지는 image 도메인에서 미리 업로드 후 URL을 받아 함께 전달한다.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Estimate Request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nailType
 *               - removalTypes
 *               - schedules
 *               - recommendType
 *             properties:
 *               nailType:
 *                 type: string
 *                 enum: [HAND, PEDICURE, BOTH]
 *               removalTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [NONE, BASIC, PARTS, EXTENSION]
 *                 minItems: 1
 *                 maxItems: 4
 *                 description: 제거 없음(NONE), 젤 제거(BASIC), 아트/파츠 제거(PARTS), 연장 제거(EXTENSION) 중 복수 선택
 *                 example: ["BASIC", "PARTS"]
 *               schedules:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 7
 *                 description: 방문 가능 날짜별 희망 시간 목록 (오늘~오늘+7일 이내, 중복 날짜 불가)
 *                 items:
 *                   type: object
 *                   required: [date, times]
 *                   properties:
 *                     date:
 *                       type: string
 *                       example: "2026-08-10"
 *                     times:
 *                       type: array
 *                       minItems: 1
 *                       maxItems: 4
 *                       items:
 *                         type: string
 *                         enum: [AM, PM, EVENING, ANY]
 *                       description: 오전(AM), 오후(PM), 저녁(EVENING), 상관없음(ANY) 복수 선택 가능
 *                       example: ["AM", "PM"]
 *                 example: [{"date": "2026-08-10", "times": ["AM", "PM"]}, {"date": "2026-08-11", "times": ["ANY"]}]
 *               recommendType:
 *                 type: string
 *                 enum: [BALANCED, CLOSE, WIDE, CHEAP]
 *               description:
 *                 type: string
 *               priceMin:
 *                 type: integer
 *                 description: 희망 최소 가격 (원, 선택) - DB 미저장, SMS 참고용
 *                 example: 70000
 *               priceMax:
 *                 type: integer
 *                 description: 희망 최대 가격 (원, 선택) - DB 미저장, SMS 참고용
 *                 example: 95000
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["http://localhost:3000/uploads/2026-07-20/uuid.jpg"]
 *               shopIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1]
 *                 description: 견적을 보낼 샵 ID 목록 (최대 20개, 주변 샵 조회 API에서 받은 값)
 *     responses:
 *       201:
 *         description: 견적 요청 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultType:
 *                   type: string
 *                   example: SUCCESS
 *                 error:
 *                   nullable: true
 *                   example: null
 *                 success:
 *                   type: object
 *                   properties:
 *                     estimateId:
 *                       type: integer
 *                       example: 1
 *                     nailType:
 *                       type: string
 *                       enum: [HAND, PEDICURE, BOTH]
 *                     removalTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: [NONE, BASIC, PARTS, EXTENSION]
 *                       example: ["BASIC", "PARTS"]
 *                     schedules:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date-time
 *                           times:
 *                             type: array
 *                             items:
 *                               type: string
 *                               enum: [AM, PM, EVENING, ANY]
 *                       example: [{"date": "2026-08-10T00:00:00.000Z", "times": ["AM", "PM"]}]
 *                     recommendType:
 *                       type: string
 *                       enum: [BALANCED, CLOSE, WIDE, CHEAP]
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     status:
 *                       type: string
 *                       enum: [MATCHING, COMPLETED, EXPIRED]
 *                     designId:
 *                       type: integer
 *                       nullable: true
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           imageId:
 *                             type: integer
 *                           imageUrl:
 *                             type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     smsPreview:
 *                       type: string
 *                       description: |
 *                         샵에 실제로 발송된 SMS 문자 원문 (클라이언트 미리보기용).
 *                         줄바꿈(\n)이 포함된 멀티라인 문자열이다.
 *                       example: "[네일내일] 견적 요청이 도착했습니다.\n\n· 종류: 손 네일\n· 제거: 젤 제거\n· 방문 가능 일정:\n  - 8월 10일 (월) 오전 (8~12시)\n· 희망 가격: 70,000원 ~ 95,000원\n· 추천 기준: 균형 추천\n\n가격과 가능한 날짜/시간을 이 번호로 문자 답장해주세요."
 *       400:
 *         description: 필수 필드 누락, 타입 불일치, 또는 shopIds 초과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultType:
 *                   type: string
 *                   example: FAIL
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: ESTIMATE_VALIDATION_FAILED
 *                     message:
 *                       type: string
 *                       example: 견적 요청 정보를 모두 입력해주세요.
 *                     data:
 *                       nullable: true
 *                 success:
 *                   nullable: true
 *                   example: null
 *       404:
 *         description: designId로 지정한 디자인이 존재하지 않음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultType:
 *                   type: string
 *                   example: FAIL
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: DESIGN_NOT_FOUND
 *                     message:
 *                       type: string
 *                       example: 존재하지 않는 디자인입니다.
 *                     data:
 *                       nullable: true
 *                 success:
 *                   nullable: true
 *                   example: null
 *       500:
 *         description: SMS 발송 실패 또는 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultType:
 *                   type: string
 *                   example: FAIL
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: ESTIMATE_REQUEST_FAILED
 *                     message:
 *                       type: string
 *                       example: 견적 요청을 보내지 못했어요. 다시 시도해주세요.
 *                     data:
 *                       nullable: true
 *                 success:
 *                   nullable: true
 *                   example: null
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *             examples:
 *               unauthorized: { value: { resultType: FAIL, error: { code: UNAUTHORIZED, message: 로그인이 필요합니다., data: null }, success: null } }
 *               tokenExpired: { value: { resultType: FAIL, error: { code: TOKEN_EXPIRED, message: 토큰이 만료됐습니다., data: null }, success: null } }
 *               tokenInvalid: { value: { resultType: FAIL, error: { code: TOKEN_INVALID, message: 유효하지 않은 토큰입니다., data: null }, success: null } }
 */

/**
 * @openapi
 * /api/v1/estimate/{status}:
 *   get:
 *     summary: 상태별 견적 요청 목록 조회
 *     description: |
 *       사용자의 견적 요청을 상태별로 조회한다. 커서 기반 페이지네이션을 사용한다.
 *       - status=ALL이면 상태 필터 없이 전체를 조회한다.
 *       - 첫 페이지는 cursor 없이 호출한다.
 *       - 다음 페이지는 응답의 pageInfo.nextCursor 값을 cursor 쿼리에 담아 호출한다.
 *       - pageInfo.hasNext=false이면 마지막 페이지다.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Estimate Request
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [MATCHING, COMPLETED, EXPIRED, ALL]
 *       - in: query
 *         name: cursor
 *         required: false
 *         schema:
 *           type: string
 *         description: 이전 응답의 pageInfo.nextCursor 값 (생략 시 첫 페이지)
 *       - in: query
 *         name: size
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: 한 번에 가져올 항목 수 (기본값 10, 최대 100)
 *     responses:
 *       200:
 *         description: 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultType:
 *                   type: string
 *                   example: SUCCESS
 *                 error:
 *                   nullable: true
 *                   example: null
 *                 success:
 *                   type: object
 *                   properties:
 *                     estimates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           estimateId:
 *                             type: integer
 *                             example: 1
 *                           images:
 *                             type: array
 *                             description: 요청에 첨부된 디자인 이미지 목록 (등록 순)
 *                             items:
 *                               type: object
 *                               properties:
 *                                 imageId:
 *                                   type: integer
 *                                 imageUrl:
 *                                   type: string
 *                                   example: "https://bucket.s3.ap-northeast-2.amazonaws.com/images/2026-08-10/uuid.jpg"
 *                           nailType:
 *                             type: string
 *                             enum: [HAND, PEDICURE, BOTH]
 *                           removalTypes:
 *                             type: array
 *                             items:
 *                               type: string
 *                               enum: [NONE, BASIC, PARTS, EXTENSION]
 *                             example: ["BASIC", "PARTS"]
 *                           schedules:
 *                             type: array
 *                             description: 방문 가능 일정 목록 (날짜별 희망 시간대)
 *                             items:
 *                               type: object
 *                               properties:
 *                                 date:
 *                                   type: string
 *                                   format: date-time
 *                                 times:
 *                                   type: array
 *                                   items:
 *                                     type: string
 *                                     enum: [AM, PM, EVENING, ANY]
 *                             example: [{"date": "2026-08-10T00:00:00.000Z", "times": ["AM", "PM"]}]
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           status:
 *                             type: string
 *                             enum: [MATCHING, COMPLETED, EXPIRED]
 *                           proposalCount:
 *                             type: integer
 *                             example: 3
 *                           submittedShopCount:
 *                             type: integer
 *                             example: 2
 *                           minPrice:
 *                             type: integer
 *                             nullable: true
 *                             example: 30000
 *                     pageInfo:
 *                       type: object
 *                       properties:
 *                         nextCursor:
 *                           type: string
 *                           nullable: true
 *                           description: 다음 페이지 요청 시 cursor 쿼리에 그대로 붙이면 됨. null이면 마지막 페이지.
 *                           example: "eyJjcmVhdGVkQXQiOiIyMDI2LTA4LTAxVDAwOjAwOjAwLjAwMFoiLCJpZCI6MX0"
 *                         hasNext:
 *                           type: boolean
 *                           example: true
 *       400:
 *         description: 유효하지 않은 status, cursor 또는 size 값 (size=0, size=101, 비정수 등)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultType:
 *                   type: string
 *                   example: FAIL
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: INVALID_ESTIMATE_REQUEST
 *                     message:
 *                       type: string
 *                       example: 유효하지 않은 요청입니다.
 *                     data:
 *                       nullable: true
 *                 success:
 *                   nullable: true
 *                   example: null
 *       500:
 *         description: 견적 목록 조회 실패
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *             example: { resultType: FAIL, error: { code: ESTIMATE_REQUEST_FAILED, message: 견적 요청을 보내지 못했어요. 다시 시도해주세요., data: null }, success: null }
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *             examples:
 *               unauthorized: { value: { resultType: FAIL, error: { code: UNAUTHORIZED, message: 로그인이 필요합니다., data: null }, success: null } }
 *               tokenExpired: { value: { resultType: FAIL, error: { code: TOKEN_EXPIRED, message: 토큰이 만료됐습니다., data: null }, success: null } }
 *               tokenInvalid: { value: { resultType: FAIL, error: { code: TOKEN_INVALID, message: 유효하지 않은 토큰입니다., data: null }, success: null } }
 */

// 두 엔드포인트 모두 로그인한 사용자만 접근 가능하다.
// authMiddleware가 Authorization: Bearer 헤더를 검증하고 req.userId를 주입한다.
estimateRequestRouter.post('/', authMiddleware, controller.createEstimateRequest);
estimateRequestRouter.get('/:status', authMiddleware, controller.getEstimatesByStatus);

export default estimateRequestRouter;
