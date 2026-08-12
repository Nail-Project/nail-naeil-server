-- AlterTable: NotificationType enum에 세분화된 알림 타입을 추가한다.
ALTER TABLE `notifications`
    MODIFY `type` ENUM(
        'ESTIMATE_RESPONSE',
        'RESERVATION_STATUS',
        'LOWER_ESTIMATE',
        'ESTIMATE_CLOSED',
        'RESERVATION_CONFIRMED',
        'RESERVATION_CANCELLED',
        'RESERVATION_DAY_BEFORE',
        'RESERVATION_DAY_OF'
    ) NOT NULL;
