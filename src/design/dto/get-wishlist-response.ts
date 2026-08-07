// GET /api/v1/designs/wishlist - 찜한 디자인 목록 조회 성공 시 Response
// 아이템 필드는 디자인 피드(DesignSummaryItem)와 동일하게 재사용한다 - 이 목록은
// 전부 찜한 디자인이라 isBookmarked가 항상 true이므로 그 필드는 넣지 않는다.
import type { DesignSummaryItem, PageInfo } from './get-designs-response';

export interface GetWishlistResponse {
  designs: DesignSummaryItem[];
  pageInfo: PageInfo;
}
