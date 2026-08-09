// 두 좌표 사이의 대권거리(haversine)를 미터 단위로 계산한다.
// 샵 목록/검색/상세 조회에서 쓰던 계산식을 예약 상세에서도 재사용하기 위해 공용으로 뺐다(2026-08-09).
export const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)));
};
