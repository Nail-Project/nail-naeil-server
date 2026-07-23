export interface CreateSmsMessageResponse {
  id: number;
  source: string;
  messageId: string;
  direction: 'INBOUND';
  status: 'PENDING' | 'SENT' | 'PARSED' | 'FAILED';
  createdAt: string;
}
