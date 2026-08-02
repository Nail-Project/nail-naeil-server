import { NotificationRepository } from '../repository/notification.repository';
import {
  GetNotificationsResponse,
  NotificationItemResponse,
} from '../dto/get-notifications-response';
import { NotificationNotFoundError } from '../error/notification.error';

// 인앱 알림(내 알림 조회/읽음) 비즈니스 로직을 담당한다.
export class NotificationService {
  // 테스트에서 fake repository를 주입할 수 있도록 기본값과 함께 생성자로 받는다 (user 도메인과 동일 패턴).
  constructor(private readonly notificationRepository = new NotificationRepository()) {}

  async getMyNotifications(
    userId: number,
    query: { unread?: boolean; page: number; size: number },
  ): Promise<GetNotificationsResponse> {
    const skip = query.page * query.size;

    const [notifications, unreadCount] = await Promise.all([
      this.notificationRepository.findManyByUser(userId, {
        unread: query.unread,
        skip,
        take: query.size,
      }),
      this.notificationRepository.countUnreadByUser(userId),
    ]);

    return {
      notifications: notifications.map(toItemResponse),
      unreadCount,
      page: query.page,
      size: query.size,
    };
  }

  // 단건 읽음 처리. 본인 소유가 아니면 404로 통일해 타인의 알림 존재 여부를 숨긴다.
  async markAsRead(userId: number, notificationId: number): Promise<void> {
    const notification = await this.notificationRepository.findOneByUser(notificationId, userId);
    if (!notification) {
      throw new NotificationNotFoundError();
    }

    // 이미 읽음 상태면 불필요한 쓰기를 피한다.
    if (!notification.isRead) {
      await this.notificationRepository.markRead(notificationId);
    }
  }

  // 내 알림 전체 읽음 처리. 처리한 건수를 반환한다.
  async markAllAsRead(userId: number): Promise<{ updatedCount: number }> {
    const result = await this.notificationRepository.markAllReadByUser(userId);
    return { updatedCount: result.count };
  }
}

const toItemResponse = (notification: {
  id: number;
  type: string;
  title: string;
  body: string;
  data: unknown;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}): NotificationItemResponse => ({
  notificationId: notification.id,
  type: notification.type,
  title: notification.title,
  body: notification.body,
  data: notification.data,
  isRead: notification.isRead,
  readAt: notification.readAt,
  createdAt: notification.createdAt,
});
