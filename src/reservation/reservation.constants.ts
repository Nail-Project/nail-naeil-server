// 예약 목록 조회 API가 사용하는 상태 그룹 - CONFIRMED(확정) / PAST(지난 예약)
// service와 dto 양쪽에서 참조하므로 둘 중 어느 쪽에도 속하지 않는 별도 파일로 둔다.
export const RESERVATION_LIST_STATUSES = ['CONFIRMED', 'PAST'] as const;
export type ReservationListStatus = (typeof RESERVATION_LIST_STATUSES)[number];
