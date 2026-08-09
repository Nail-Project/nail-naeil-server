import { NotificationRepository } from '../repository/notification.repository';
import {
  GetNotificationsResponse,
  NotificationItemResponse,
} from '../dto/get-notifications-response';
import type { NotificationCursor } from '../dto/get-notifications-request';
import { NotificationNotFoundError } from '../error/notification.error';
import { encodeCursor } from '../../common/pagination/cursor';
import { NotificationType, Prisma } from '../../generated/prisma/client';
import { PushSender } from '../push/push-sender';
import { createPushSender } from '../push/push-sender.factory';
import {
  NotificationSettingRepository,
  type NotificationCategory,
} from '../repository/notification-setting.repository';

// NotificationType을 사용자 알림 설정 카테고리로 매핑한다.
// 발송 게이트(notify)에서 이 매핑으로 해당 카테고리가 꺼져 있으면 발송을 건너뛴다.
const TYPE_TO_CATEGORY: Record<NotificationType, NotificationCategory> = {
  ESTIMATE_RESPONSE: 'estimate',
  LOWER_ESTIMATE: 'estimate',
  ESTIMATE_CLOSED: 'estimate',
  RESERVATION_STATUS: 'reservation',
  RESERVATION_CONFIRMED: 'reservation',
  RESERVATION_CANCELLED: 'reservation',
  RESERVATION_DAY_BEFORE: 'reservation',
  RESERVATION_DAY_OF: 'reservation',
};

// 인앱 알림(내 알림 조회/읽음) 비즈니스 로직을 담당한다.
export class NotificationService {
  // 테스트에서 fake repository/pushSender를 주입할 수 있도록 기본값과 함께 생성자로 받는다 (user 도메인과 동일 패턴).
  constructor(
    private readonly notificationRepository = new NotificationRepository(),
    // Firebase 설정 여부에 따라 FcmPushSender(운영) 또는 NoopPushSender(로컬/테스트)가 주입된다.
    private readonly pushSender: PushSender = createPushSender(),
    // 사용자별 알림 수신 설정을 확인해 꺼진 카테고리는 발송하지 않는다.
    private readonly notificationSettingRepository = new NotificationSettingRepository(),
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
  // 사용자가 해당 카테고리 알림을 껐으면 인앱 저장·푸시 모두 건너뛴다.
  // 이후 인앱 알림을 저장한 뒤 푸시를 발송하되, 푸시 실패가 알림 생성 자체를 막지 않도록 격리한다.
  async notify(params: {
    userId: number;
    type: NotificationType;
    title: string;
    body: string;
    data?: Prisma.InputJsonValue;
  }): Promise<void> {
    // 발송 게이트: 사용자 설정에서 해당 카테고리가 꺼져 있으면 아무것도 하지 않는다.
    const category = TYPE_TO_CATEGORY[params.type];
    const enabled = await this.notificationSettingRepository.isCategoryEnabled(
      params.userId,
      category,
    );
    if (!enabled) return;

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
