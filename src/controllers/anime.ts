import { Context } from "hono";
import { supabaseService } from "../db/supabase";
import { CreateAnimeDTO } from "../types";
import { AppError, isAppError } from "../utils/errors";
import { validators } from "../utils/validation";

// Add anime validation schema
export const addAnimeSchema = {
  name: validators.isString,
  vote_average: validators.isValidRating,
  image_url: validators.isString,
};

//upload anime
export async function addAnime(c: Context) {
  try {
    const user = c.get("user");
    const animeData = await c.req.json();

    console.log("User ID:", user.userId);
    console.log("Anime Data:", animeData);

    // Validate status
    const validStatuses = ["watching", "completed", "plan_to_watch", "dropped"];
    if (!validStatuses.includes(animeData.status)) {
      throw new Error(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      );
    }

    const data: CreateAnimeDTO = {
      name: animeData.name,
      image_url: animeData.image_url,
      vote_average: animeData.vote_average || null,
      status: animeData.status,
      genres: animeData.genres || [],
      mal_id: animeData.mal_id,
    };

    const result = await supabaseService.addAnime(data, user.userId);
    return c.json({ message: "Anime added successfully", data: result }, 201);
  } catch (error: any) {
    console.error("Failed to add anime:", error);
    return c.json(
      { error: "Failed to add anime", details: error.message },
      400
    );
  }
}

export async function deleteAnime(c: Context) {
  try {
    const user = c.get("user");
    const { id } = c.req.param();
    await supabaseService.deleteAnime(id, user.userId);
    return c.json({ message: "Anime deleted successfully" });
  } catch (error) {
    return c.json({ error: "Failed to delete anime" }, 400);
  }
}

export async function getAnimeList(c: Context) {
  try {
    const user = c.get("user");
    console.log("Fetching anime list for user:", user.userId);

    const data = await supabaseService.getAnimeList(user.userId);
    return c.json(data);
  } catch (error) {
    console.error("Failed to fetch anime list:", error);
    return c.json({ error: "Failed to fetch anime list" }, 400);
  }
}

export async function updateAnimeStatus(c: Context) {
  try {
    const user = c.get("user");
    const { id } = c.req.param();
    const { status } = await c.req.json();

    // Validate status
    const validStatuses = ["watching", "completed", "plan_to_watch", "dropped"];
    if (!validStatuses.includes(status)) {
      return c.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        400
      );
    }

    await supabaseService.updateAnimeStatus(id, user.userId, status);
    return c.json({ message: "Status updated successfully" });
  } catch (error: any) {
    console.error("Failed to update status:", error);
    return c.json({ error: "Failed to update status" }, 400);
  }
}

export async function updateAnime(c: Context) {
  try {
    const user = c.get("user");
    const { id } = c.req.param();
    const updateData = await c.req.json<Partial<CreateAnimeDTO>>();

    if (
      updateData.vote_average &&
      (updateData.vote_average < 0 || updateData.vote_average > 10)
    ) {
      return c.json({ error: "Rating must be between 0 and 10" }, 400);
    }

    const result = await supabaseService.updateAnime(
      id,
      user.userId,
      updateData
    );
    return c.json({
      message: "Anime updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Failed to update anime:", error);
    return c.json({ error: "Failed to update anime" }, 400);
  }
}
