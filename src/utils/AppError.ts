export class AppError extends Error {
  code?: string;
  status?: number;

  constructor(messageKey: string, code?: string, status?: number) {
    super(messageKey);
    this.code = code;
    this.status = status;
  }
}