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
  console.log("Token received:", token.substring(0, 20) + "...");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    console.log("Decoded token:", decoded);
    c.set("user", decoded);
    await next();
  } catch (error) {
    console.error("Token verification error:", error);
    return c.json({ error: "Invalid token" }, 401);
  }
}
