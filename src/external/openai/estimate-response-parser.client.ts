import { z } from 'zod';

const DEFAULT_OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-5-nano';
const DEFAULT_OPENAI_TIMEOUT_MS = 15_000;

const parsedEstimateResponseSchema = z.object({
  canProvideService: z.boolean(),
  totalPrice: z.number().int().nonnegative().nullable(),
  basePrice: z.number().int().nonnegative().nullable(),
  removalPrice: z.number().int().nonnegative(),
  extraPrice: z.number().int().nonnegative(),
  memo: z.string().nullable(),
  proposalDateTimes: z.array(z.iso.datetime({ offset: true })),
});

export type ParsedEstimateResponse = z.infer<typeof parsedEstimateResponseSchema>;

export interface EstimateResponseParser {
  parse(input: {
    messages: string[];
    receivedAt: string;
    requestStartDate: string;
    requestEndDate: string;
  }): Promise<ParsedEstimateResponse>;
}

interface OpenAiResponse {
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    canProvideService: { type: 'boolean' },
    totalPrice: { type: ['integer', 'null'] },
    basePrice: { type: ['integer', 'null'] },
    removalPrice: { type: 'integer' },
    extraPrice: { type: 'integer' },
    memo: { type: ['string', 'null'] },
    proposalDateTimes: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: [
    'canProvideService',
    'totalPrice',
    'basePrice',
    'removalPrice',
    'extraPrice',
    'memo',
    'proposalDateTimes',
  ],
} as const;

export class OpenAiEstimateResponseParser implements EstimateResponseParser {
  async parse(input: {
    messages: string[];
    receivedAt: string;
    requestStartDate: string;
    requestEndDate: string;
  }): Promise<ParsedEstimateResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
    }

    const controller = new AbortController();
    const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS ?? DEFAULT_OPENAI_TIMEOUT_MS);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(process.env.OPENAI_API_URL ?? DEFAULT_OPENAI_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
          store: false,
          input: [
            {
              role: 'system',
              content:
                '당신은 네일샵의 한국어 문자 답장에서 견적 정보를 추출한다. 문자에 명시된 정보만 사용하고 추측하지 않는다. 상대 날짜는 Asia/Seoul 기준 수신 시각으로 계산한다. 정확한 가격이나 예약 날짜와 시간이 없으면 null 또는 빈 배열을 반환한다. 가격 상세가 없으면 basePrice는 totalPrice와 같게 한다. memo에는 가격과 예약 시간을 제외한 샵의 안내를 간결히 합친다.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                receivedAt: input.receivedAt,
                requestPeriod: {
                  startDate: input.requestStartDate,
                  endDate: input.requestEndDate,
                },
                messages: input.messages,
              }),
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'estimate_response',
              strict: true,
              schema: OUTPUT_SCHEMA,
            },
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenAI API 호출 실패: ${response.status}`);
      }

      const responseBody = (await response.json()) as OpenAiResponse;
      const outputText = responseBody.output
        ?.flatMap((item) => item.content ?? [])
        .find((content) => content.type === 'output_text')?.text;

      if (!outputText) {
        throw new Error('OpenAI API 응답에 구조화 결과가 없습니다.');
      }

      return parsedEstimateResponseSchema.parse(JSON.parse(outputText));
    } finally {
      clearTimeout(timeout);
    }
  }
}
