// POST /api/v1/image/upload - 이미지 업로드 성공 시 Response
// 최대 3장까지 한 번에 업로드하며 S3 URL 목록을 반환한다.
export interface ImageUploadResponse {
  imageUrls: string[];
}
