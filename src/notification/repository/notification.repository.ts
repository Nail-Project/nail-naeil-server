import { getPrisma } from '../../infra/prisma';
import { NotificationType, Prisma } from '../../generated/prisma/client';

export class NotificationRepository {
  // 내 알림 목록: 최신순(createdAt, id 내림차순) 커서 기반(keyset) 페이지네이션.
  // unread=true면 안읽은 것만. take보다 1개 더 가져와 다음 페이지 유무 판단은 서비스에서 한다.
  findManyByUser(
    userId: number,
    params: { unread?: boolean; cursor?: { createdAt: Date; id: number }; take: number },
  ) {
    return getPrisma().notification.findMany({
      where: {
        userId,
        ...(params.unread ? { isRead: false } : {}),
        // (createdAt, id) 둘 다 정렬 방향과 같게 비교해야 커서 이후 항목만 걸러진다.
        ...(params.cursor && {
          OR: [
            { createdAt: { lt: params.cursor.createdAt } },
            { createdAt: params.cursor.createdAt, id: { lt: params.cursor.id } },
          ],
        }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: params.take + 1,
    });
  }

  // 안읽은 알림 개수(뱃지용). 목록 페이지와 무관하게 전체 기준.
  countUnreadByUser(userId: number) {
    return getPrisma().notification.count({ where: { userId, isRead: false } });
  }

  // 소유권 검증용 단건 조회: 본인(userId) 알림이 아니면 null.
  findOneByUser(notificationId: number, userId: number) {
    return getPrisma().notification.findFirst({ where: { id: notificationId, userId } });
  }

  // 단건 읽음 처리. 이미 읽음 상태여도 멱등하게 동작한다.
  markRead(notificationId: number) {
    return getPrisma().notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // 전체 읽음 처리: 안읽은 것만 갱신하고 처리 건수를 반환한다.
  markAllReadByUser(userId: number) {
    return getPrisma().notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // 알림 생성(내부용). 후속 단계(견적/예약 트리거)에서 호출한다.
  create(data: {
    userId: number;
    type: NotificationType;
    title: string;
    body: string;
    data?: Prisma.InputJsonValue;
  }) {
    return getPrisma().notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data,
      },
    });
  }
}
