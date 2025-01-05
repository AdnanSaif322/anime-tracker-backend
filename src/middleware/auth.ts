import { Context, Next } from "hono";
import jwt from "jsonwebtoken";

interface UserContext {
  user: {
    userId: string;
    email: string;
  };
}

interface DecodedToken {
  userId: string;
  email: string;
}

export async function authMiddleware(
  c: Context<{ Variables: UserContext }>,
  next: Next
) {
  const authHeader = c.req.header("Authorization");
  console.log("Auth header:", authHeader);

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "No token provided" }, 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    console.log("Token details:", {
      userId: decoded.userId,
      email: decoded.email,
      origin: c.req.header("Origin") || "no-origin",
      path: c.req.path,
      method: c.req.method,
    });
    c.set("user", decoded);
    await next();
  } catch (error) {
    console.error("Token verification error:", error);
    return c.json({ error: "Invalid token" }, 401);
  }
}
