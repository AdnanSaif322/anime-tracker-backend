import { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import { getCookie } from "hono/cookie";

interface DecodedToken {
  userId: string;
  email: string;
}

export async function authMiddleware(c: Context, next: Next) {
  const token = getCookie(c, "auth_token");
  console.log("Auth token from cookie:", token ? "exists" : "missing");

  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    console.log("Token verified for user:", decoded.email);
    c.set("user", decoded);
    await next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return c.json({ error: "Invalid token" }, 401);
  }
}
