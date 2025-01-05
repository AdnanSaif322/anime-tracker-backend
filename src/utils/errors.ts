import type { StatusCode } from "hono/utils/http-status";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: 400 | 401 | 403 | 404 | 500 = 400,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};
