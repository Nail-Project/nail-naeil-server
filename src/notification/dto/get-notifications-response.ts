// GET /api/notifications 응답 DTO
// Prisma Notification 모델을 그대로 노출하지 않고 필요한 필드만 반환한다.
export interface NotificationItemResponse {
  notificationId: number;
  type: string;
  title: string;
  body: string;
  data: unknown;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export interface GetNotificationsResponse {
  notifications: NotificationItemResponse[];
  // 안읽은 알림 개수(뱃지 표시용). 현재 조회 페이지와 무관하게 전체 기준.
  unreadCount: number;
  page: number;
  size: number;
}
