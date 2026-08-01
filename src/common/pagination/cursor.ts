// 커서 기반 페이지네이션 공통 인코딩/디코딩 - 각 도메인은 자신의 커서 payload 형태를
// zod로 직접 검증하고, 이 모듈은 base64url 문자열 <-> JSON 변환만 담당한다.

export const encodeCursor = (payload: Record<string, unknown>): string =>
  Buffer.from(JSON.stringify(payload)).toString('base64url');

// 디코딩 실패(형식이 아예 깨진 base64/JSON) 시 undefined를 반환한다.
// 필드 형태(타입)가 맞는지는 호출하는 쪽의 zod 스키마가 검증한다.
export const decodeCursor = (cursor: string): unknown => {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
  } catch {
    return undefined;
  }
};
