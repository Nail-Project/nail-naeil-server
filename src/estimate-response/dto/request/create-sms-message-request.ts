import { z } from 'zod';

export const createSmsMessageRequestSchema = z.object({
  source: z.string().trim().min(1).max(100),
  messageId: z.string().trim().min(1).max(100),
  rawPayload: z
    .object({
      address: z.string().trim().min(1).max(30),
      body: z.string().trim().min(1).max(10_000),
      receivedAt: z.iso.datetime({ offset: true }),
    })
    .catchall(z.json()),
});

export type CreateSmsMessageRequest = z.infer<typeof createSmsMessageRequestSchema>;
