import { NotificationRepository } from '../repository/notification.repository';
import {
  GetNotificationsResponse,
  NotificationItemResponse,
} from '../dto/get-notifications-response';
import type { NotificationCursor } from '../dto/get-notifications-request';
import { NotificationNotFoundError } from '../error/notification.error';
import { encodeCursor } from '../../common/pagination/cursor';
import { NotificationType, Prisma } from '../../generated/prisma/client';
import { PushSender, NoopPushSender } from '../push/push-sender';

// 인앱 알림(내 알림 조회/읽음) 비즈니스 로직을 담당한다.
export class NotificationService {
  // 테스트에서 fake repository/pushSender를 주입할 수 있도록 기본값과 함께 생성자로 받는다 (user 도메인과 동일 패턴).
  constructor(
    private readonly notificationRepository = new NotificationRepository(),
    private readonly pushSender: PushSender = new NoopPushSender(),
  ) {}

  async getMyNotifications(
    userId: number,
    query: { unread?: boolean; cursor?: NotificationCursor; size: number },
  ): Promise<GetNotificationsResponse> {
    // size보다 1개 더 가져와, 그 1개가 존재하면 다음 페이지가 있다는 뜻으로 사용한다(count 쿼리 대체).
    const [rows, unreadCount] = await Promise.all([
      this.notificationRepository.findManyByUser(userId, {
        unread: query.unread,
        cursor: query.cursor,
        take: query.size,
      }),
      this.notificationRepository.countUnreadByUser(userId),
    ]);

    const hasNext = rows.length > query.size;
    const notifications = hasNext ? rows.slice(0, query.size) : rows;
    const last = notifications[notifications.length - 1];
    const nextCursor =
      hasNext && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null;

    return {
      notifications: notifications.map(toItemResponse),
      unreadCount,
      nextCursor,
      hasNext,
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

  // 알림 생성(내부용). 견적 응답 도착·예약 상태 변경 등 이벤트 지점에서 호출한다.
  // 인앱 알림을 저장한 뒤 푸시를 발송하되, 푸시 실패가 알림 생성 자체를 막지 않도록 격리한다.
  async notify(params: {
    userId: number;
    type: NotificationType;
    title: string;
    body: string;
    data?: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.notificationRepository.create(params);

    try {
      await this.pushSender.send({
        userId: params.userId,
        title: params.title,
        body: params.body,
        data: params.data,
      });
    } catch (error) {
      console.error('[NotificationService] 푸시 발송 실패(알림은 저장됨)', error);
    }
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
