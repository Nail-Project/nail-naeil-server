// Prisma의 JsonValue와 동일한 구조의 순수 타입. ORM 타입을 응답 DTO에 직접 노출하지 않기 위해 별도로 둔다.
// JsonObject의 optional 인덱스 시그니처(`?`)는 Prisma.JsonValue와의 구조적 호환을 위해 그대로 맞춘 것.
export type JsonObject = { [key: string]: JsonValue | undefined };
export type JsonArray = JsonValue[];
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
