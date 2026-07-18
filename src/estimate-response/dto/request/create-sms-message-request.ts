import { z } from 'zod';

export const createSmsMessageRequestSchema = z.object({
  messageId: z.string().trim().min(1).max(100),
  rawPayload: z.json(),
});

export type CreateSmsMessageRequest = z.infer<typeof createSmsMessageRequestSchema>;
