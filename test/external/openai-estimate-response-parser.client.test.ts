import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAiEstimateResponseParser } from '../../src/external/openai/estimate-response-parser.client';

describe('OpenAiEstimateResponseParser', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
  });

  it('OpenAI 구조화 출력을 견적 응답으로 검증한다', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    canProvideService: true,
                    totalPrice: 55_000,
                    basePrice: 55_000,
                    removalPrice: 0,
                    extraPrice: 0,
                    memo: '제거 포함',
                    proposalDateTimes: ['2026-08-03T14:00:00+09:00'],
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const parser = new OpenAiEstimateResponseParser();
    await expect(
      parser.parse({
        messages: ['제거 포함 55000원, 8월 3일 오후 2시 가능해요.'],
        receivedAt: '2026-08-01T13:20:38+09:00',
        requestStartDate: '2026-08-01',
        requestEndDate: '2026-08-07',
      }),
    ).resolves.toMatchObject({
      totalPrice: 55_000,
      proposalDateTimes: ['2026-08-03T14:00:00+09:00'],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({ method: 'POST' }),
    );
    const requestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as {
      model: string;
    };
    expect(requestBody.model).toBe('gpt-5-nano');
  });
});
