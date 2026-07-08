export interface AppErrorParams {
  code: string;
  statusCode: number;
  message: string;
  data?: unknown;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly data: unknown;

  constructor(params: AppErrorParams) {
    super(params.message);
    this.name = new.target.name;
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.data = params.data ?? null;
  }
}
