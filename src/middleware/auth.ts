import { Context, Next } from "hono";
import jwt from "jsonwebtoken";

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    c.set("user", decoded);
    await next();
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
}
