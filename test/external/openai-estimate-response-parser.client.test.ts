import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAiEstimateResponseParser } from '../../src/external/openai/estimate-response-parser.client';

describe('OpenAiEstimateResponseParser', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_URL;
    delete process.env.OPENAI_MODEL;
    delete process.env.OPENAI_TIMEOUT_MS;
  });

  it('API 키가 없으면 호출 전에 거부한다', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      new OpenAiEstimateResponseParser().parse({
        messages: ['견적 문자'],
        receivedAt: '2026-08-01T13:20:38+09:00',
        scheduleDates: ['2026-08-01', '2026-08-07'],
      }),
    ).rejects.toThrow('OPENAI_API_KEY');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('구조화 출력이 없으면 거부한다', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ output: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(
      new OpenAiEstimateResponseParser().parse({
        messages: ['견적 문자'],
        receivedAt: '2026-08-01T13:20:38+09:00',
        scheduleDates: ['2026-08-01', '2026-08-07'],
      }),
    ).rejects.toThrow('구조화 결과');
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
                    estimatedDurationMinutes: 60,
                    isRemovalIncluded: true,
                    totalPrice: 55_000,
                    basePrice: 55_000,
                    removalPrice: 0,
                    designExtraPrice: 0,
                    optionExtraPrice: 0,
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
        scheduleDates: ['2026-08-01', '2026-08-07'],
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

  it('총액만 확인된 응답은 상세 가격을 null로 유지한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output: [
          {
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  canProvideService: true,
                  estimatedDurationMinutes: 60,
                  isRemovalIncluded: false,
                  totalPrice: 55_000,
                  basePrice: null,
                  removalPrice: null,
                  designExtraPrice: null,
                  optionExtraPrice: null,
                  memo: null,
                  proposalDateTimes: ['2026-08-03T14:00:00+09:00'],
                }),
              },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    process.env.OPENAI_API_KEY = 'test-key';

    await expect(
      new OpenAiEstimateResponseParser().parse({
        messages: ['총 55,000원입니다.'],
        receivedAt: '2026-08-01T10:00:00+09:00',
        scheduleDates: ['2026-08-02', '2026-08-07'],
      }),
    ).resolves.toMatchObject({
      totalPrice: 55_000,
      basePrice: null,
      removalPrice: null,
      designExtraPrice: null,
      optionExtraPrice: null,
    });
  });
});
