import { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import { getCookie } from "hono/cookie";

interface DecodedToken {
  userId: string;
  email: string;
}

export async function authMiddleware(c: Context, next: Next) {
  const token = getCookie(c, "auth_token");

  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    c.set("user", decoded);
    await next();
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
}
