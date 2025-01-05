import { Context, Hono } from "hono";
import {
  addAnime,
  deleteAnime,
  getAnimeList,
  updateAnime,
  addAnimeSchema,
  updateAnimeStatus,
} from "../controllers/anime";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../utils/validation";
import { supabaseService } from "../db/supabase";

const anime = new Hono();

// Apply auth middleware to all anime routes
anime.use("/*", authMiddleware);

anime.post("/add", validateBody(addAnimeSchema), addAnime);
anime.delete("/delete/:id", deleteAnime);

interface UserContext {
  user: {
    userId: string;
    email: string;
  };
}

anime.get("/list", async (c: Context<{ Variables: UserContext }>) => {
  try {
    const user = c.get("user");
    console.log("Getting anime list for user:", {
      userId: user.userId,
      email: user.email,
      headers: {
        origin: c.req.header("Origin"),
        userAgent: c.req.header("User-Agent"),
      },
      token: c.req.header("Authorization")?.substring(0, 20) + "...",
    });

    if (!user?.userId) {
      return c.json({ error: "User ID not found in token" }, 401);
    }

    const data = await supabaseService.getAnimeList(user.userId);
    console.log("Anime list response:", {
      userId: user.userId,
      count: data.length,
      data: data,
    });

    return c.json(data);
  } catch (error) {
    console.error("Error in /anime/list:", error);
    return c.json({ error: "Failed to fetch anime list" }, 500);
  }
});
anime.patch("/update/:id", updateAnime);
anime.patch("/status/:id", updateAnimeStatus);

export default anime;
