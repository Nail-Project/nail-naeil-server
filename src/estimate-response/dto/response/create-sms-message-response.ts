export interface CreateSmsMessageResponse {
  id: number;
  messageId: string;
  direction: 'INBOUND';
  status: 'PENDING' | 'SENT' | 'PARSED' | 'FAILED';
  createdAt: string;
}
