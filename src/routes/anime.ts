import { Hono } from "hono";
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

const anime = new Hono();

// Apply auth middleware to all anime routes
anime.use("/*", authMiddleware);

anime.post("/add", validateBody(addAnimeSchema), addAnime);
anime.delete("/delete/:id", deleteAnime);
anime.get("/list", getAnimeList);
anime.patch("/update/:id", updateAnime);
anime.patch("/status/:id", updateAnimeStatus);

export default anime;
