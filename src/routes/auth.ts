import { Hono } from "hono";
import {
  register,
  login,
  getProfile,
  logout,
  refreshToken,
} from "../controllers/auth";
import { authMiddleware } from "../middleware/auth";
import { supabaseService } from "../db/supabase";

const auth = new Hono();

auth.post("/register", async (c) => {
  try {
    const { email, password, username } = await c.req.json();

    // Add validation
    if (!email || !password || !username) {
      return c.json({ error: "All fields are required" }, 400);
    }

    // Add logging
    console.log("Registration attempt for:", email);

    const result = await supabaseService.createUser(email, password, username);
    return c.json(result);
  } catch (error) {
    console.error("Registration error:", error);
    return c.json({ error: "Failed to register user" }, 500);
  }
});
auth.post("/login", login);
auth.get("/profile", authMiddleware, getProfile);
auth.post("/logout", logout);
auth.post("/refresh", refreshToken);

export default auth;
