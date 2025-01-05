import { Context, Next } from "hono";
import { AppError } from "./errors";

export const validateBody = <T>(schema: {
  [K in keyof T]: (value: unknown) => boolean;
}) => {
  return async (c: Context, next: Next) => {
    const body = await c.req.json();

    for (const [key, validator] of Object.entries(schema) as [
      string,
      (value: unknown) => boolean
    ][]) {
      if (!validator(body[key])) {
        throw new AppError(`Invalid ${key}`, 400);
      }
    }

    await next();
  };
};

export const validators = {
  isString: (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0,

  isNumber: (value: unknown): value is number =>
    typeof value === "number" && !isNaN(value),

  isValidStatus: (value: unknown): boolean =>
    typeof value === "string" &&
    ["watching", "completed", "plan_to_watch", "dropped"].includes(value),

  isValidRating: (value: unknown): boolean =>
    value === null || (typeof value === "number" && value >= 0 && value <= 10),
};
