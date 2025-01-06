import { Context } from "hono";
import jwt from "jsonwebtoken";
import { supabaseService, supabase } from "../db/supabase";
import type { CustomContext } from "../types/context";
import { getCookie, setCookie } from "hono/cookie";

interface DecodedToken {
  userId: string;
  email: string;
}

export async function register(c: Context) {
  try {
    const { email, password, username } = await c.req.json();

    if (!email || !password || !username) {
      return c.json(
        {
          error: "Email, password and username are required",
        },
        400
      );
    }

    try {
      await supabaseService.signUp(email, password, username);
      return c.json({ message: "User registered successfully" }, 201);
    } catch (error: any) {
      console.error("Supabase error:", error);

      // Handle rate limit error specifically
      if (error?.status === 429) {
        return c.json(
          {
            error: "Please wait 1 minute before trying to register again",
            retryAfter: 60, // seconds
          },
          429
        );
      }

      return c.json(
        {
          error: error.message || "Registration failed",
          details: error,
        },
        400
      );
    }
  } catch (error) {
    console.error("Request error:", error);
    return c.json({ error: "Invalid request format" }, 400);
  }
}

export async function login(c: Context<CustomContext>) {
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
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    console.log("Request origin:", c.req.header("Origin"));
    console.log("Request protocol:", c.req.header("X-Forwarded-Proto"));

    c.res.headers.append(
      "Set-Cookie",
      `auth_token=${token}; HttpOnly; Secure; SameSite=None; Path=/`
    );

    c.res.headers.append("Access-Control-Allow-Credentials", "true");
    c.res.headers.append(
      "Access-Control-Allow-Origin",
      "https://anime-tracker-frontend.vercel.app"
    );
    c.res.headers.append(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    console.log("Final response headers:", {
      cookie: c.res.headers.get("Set-Cookie"),
      cors: c.res.headers.get("Access-Control-Allow-Origin"),
      credentials: c.res.headers.get("Access-Control-Allow-Credentials"),
    });

    return c.json({
      message: "Login successful",
      token: token,
      user: {
        email: user.email,
        id: user.id,
      },
    });
  } catch (error) {
    return c.json({ error: "Authentication failed" }, 401);
  }
}

export async function getProfile(c: Context) {
  try {
    const user = c.get("user");
    const { data, error } = await supabase
      .from("users")
      .select("username, email, role")
      .eq("id", user.userId)
      .single();

    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: "Failed to fetch profile" }, 400);
  }
}

export async function logout(c: Context<CustomContext>) {
  setCookie(c, "auth_token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 0,
    path: "/",
  });
  return c.json({ message: "Logged out successfully" });
}

export async function refreshToken(c: Context<CustomContext>) {
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
      {
        userId: decoded.userId,
        email: decoded.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    setCookie(c, "auth_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return c.json({ message: "Token refreshed" });
  } catch (error) {
    return c.json({ error: "Failed to refresh token" }, 401);
  }
}
