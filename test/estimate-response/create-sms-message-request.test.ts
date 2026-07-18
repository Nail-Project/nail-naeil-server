import { describe, expect, it } from 'vitest';
import { createSmsMessageRequestSchema } from '../../src/estimate-response/dto/request/create-sms-message-request';

describe('createSmsMessageRequestSchema', () => {
  it('안드로이드 문자 ID와 원본 JSON을 검증한다', () => {
    const result = createSmsMessageRequestSchema.safeParse({
      messageId: 'android-sms-1042',
      rawPayload: {
        address: '01012345678',
        body: '젤 제거 포함 55000원입니다.',
        receivedAt: '2026-07-18T13:20:38+09:00',
      },
    });

    expect(result.success).toBe(true);
  });

  it('문자 ID가 없으면 거부한다', () => {
    expect(
      createSmsMessageRequestSchema.safeParse({
        rawPayload: { body: '견적 문자' },
      }).success,
    ).toBe(false);
  });

  it('JSON으로 저장할 수 없는 값은 거부한다', () => {
    expect(
      createSmsMessageRequestSchema.safeParse({
        messageId: 'android-sms-1042',
        rawPayload: { invalid: undefined },
      }).success,
    ).toBe(false);
  });
});
