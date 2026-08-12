import { describe, it, expect } from 'vitest';
import { SolapiTextSmsClient } from '../../src/external/coolsms/sms.client';

describe('SolapiTextSmsClient', () => {
  it('SMS 비활성(키/ENABLED 미설정) 환경에서는 실제 발송 없이 정상 통과한다', async () => {
    const client = new SolapiTextSmsClient();

    await expect(client.sendText('01012345678', '테스트 문자')).resolves.toBeUndefined();
  });
});
