import { Context } from "hono";
import jwt from "jsonwebtoken";
import { supabaseService } from "../db/supabase";
import { getCookie } from "hono/cookie";

interface DecodedToken {
  userId: string;
  email: string;
}

export async function register(c: Context) {
  try {
    const { email, password, username } = await c.req.json();

    if (!email || !password || !username) {
      return c.json(
        { error: "Email, password and username are required" },
        400
      );
    }

    try {
      await supabaseService.signUp(email, password, username);
      return c.json({ message: "User registered successfully" }, 201);
    } catch (error: any) {
      if (error?.status === 429) {
        return c.json(
          {
            error: "Please wait 1 minute before trying to register again",
            retryAfter: 60,
          },
          429
        );
      }
      return c.json({ error: error.message || "Registration failed" }, 400);
    }
  } catch (error) {
    return c.json({ error: "Invalid request format" }, 400);
  }
}

export async function login(c: Context) {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const { data: user, error } = await supabaseService.signIn(email, password);

    if (error || !user) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    c.res.headers.append(
      "Set-Cookie",
      `auth_token=${token}; HttpOnly; Secure; SameSite=None; Path=/; Domain=.vercel.app`
    );

    return c.json({
      message: "Login successful",
      user: { email: user.email, id: user.id },
    });
  } catch (error) {
    return c.json({ error: "Authentication failed" }, 401);
  }
}

export async function getProfile(c: Context) {
  try {
    const user = c.get("user");
    const { data, error } = await supabaseService.getUserProfile(user.userId);

    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: "Failed to fetch profile" }, 400);
  }
}

export async function logout(c: Context) {
  c.res.headers.append(
    "Set-Cookie",
    "auth_token=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0"
  );
  return c.json({ message: "Logged out successfully" });
}

export async function refreshToken(c: Context) {
  try {
    const currentToken = getCookie(c, "auth_token");

    if (!currentToken) {
      return c.json({ error: "No token to refresh" }, 401);
    }

    const decoded = jwt.verify(
      currentToken,
      process.env.JWT_SECRET!
    ) as DecodedToken;

    const newToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    c.res.headers.append(
      "Set-Cookie",
      `auth_token=${newToken}; HttpOnly; Secure; SameSite=None; Path=/`
    );

    return c.json({ message: "Token refreshed" });
  } catch (error) {
    return c.json({ error: "Failed to refresh token" }, 401);
  }
}
