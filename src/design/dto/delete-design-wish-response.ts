// DELETE /api/v1/designs/:designId/wish - 디자인 찜 삭제 성공 시 Response
export interface DeleteDesignWishResponse {
  isBookmarked: boolean;
  wishCount: number;
}
