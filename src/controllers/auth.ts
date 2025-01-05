import { Context } from "hono";
import jwt from "jsonwebtoken";
import { supabaseService, supabase } from "../db/supabase";

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

export async function login(c: Context) {
  try {
    const { email, password } = await c.req.json();
    console.log("Login attempt for:", email);

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
        type: "access_token",
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "24h",
        algorithm: "HS256",
      }
    );

    return c.json({ token, user });
  } catch (error) {
    console.error("Login error:", error);
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
