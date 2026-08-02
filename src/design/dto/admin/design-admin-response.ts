// POST/PATCH /admin/api/v1/designs(/:designId) - 생성/수정 성공 시 Response
export interface DesignAdminResponse {
  designId: number;
  title: string;
  imageUrl: string;
  images: string[];
  tags: string[];
  durationMinutes: number;
  difficulty: string;
  recommendedShape: string;
  description: string;
}
