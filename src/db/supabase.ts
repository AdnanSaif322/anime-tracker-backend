import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { CreateAnimeDTO } from "../types";

// Load environment variables
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    fetch: async (url, options = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        return await fetch(url, {
          ...options,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    },
  },
});

// Create a separate admin client
const adminClient = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: async (url, options = {}) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
          return await fetch(url, {
            ...options,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }
      },
    },
  }
);

export class SupabaseService {
  // Auth methods
  async signUp(email: string, password: string, username: string) {
    try {
      // First check if user exists in auth
      const { data: existingAuthUser } =
        await adminClient.auth.admin.listUsers();
      const authUserExists = existingAuthUser.users.some(
        (user) => user.email === email
      );

      if (authUserExists) {
        // Delete the existing auth user
        const { data: authUser } = await adminClient.auth.admin.listUsers();
        const userToDelete = authUser.users.find(
          (user) => user.email === email
        );
        if (userToDelete) {
          await adminClient.auth.admin.deleteUser(userToDelete.id);
        }
      }

      // Also check and clean public.users table
      const { data: existingPublicUser } = await adminClient
        .from("users")
        .select("id")
        .eq("email", email);

      if ((existingPublicUser?.length ?? 0) > 0) {
        await adminClient.from("users").delete().eq("email", email);
      }

      // Now create new auth user
      const { data: authData, error: authError } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            username,
            role: "user",
          },
        });

      if (authError) {
        console.error("Auth creation error:", authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Failed to create user");
      }

      // Create user profile
      const { error: profileError } = await adminClient.from("users").insert({
        id: authData.user.id,
        email: email,
        username: username,
        role: "user",
      });

      if (profileError) {
        console.error("Error creating user profile:", profileError);
        // Clean up auth user if profile creation fails
        await adminClient.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      return authData;
    } catch (error) {
      console.error("SupabaseService signUp error:", error);
      throw error;
    }
  }

  async signIn(email: string, password: string) {
    const response = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      data: response.data?.user || null,
      error: response.error,
    };
  }

  // Anime methods
  async addAnime(data: CreateAnimeDTO, userId: string) {
    try {
      console.log("Adding anime with data:", data);
      console.log("For user:", userId);

      // First, check if anime exists
      const { data: existingAnime, error: searchError } = await supabase
        .from("anime_list")
        .select("id, name")
        .eq("name", data.name)
        .single();

      if (searchError && searchError.code !== "PGRST116") {
        console.error("Error searching anime:", searchError);
        throw searchError;
      }

      let animeToUse = existingAnime;

      // If anime doesn't exist, create it
      if (!existingAnime) {
        console.log("Creating new anime entry");
        const { data: newAnime, error: insertError } = await supabase
          .from("anime_list")
          .insert([
            {
              name: data.name,
              image_url: data.image_url,
              vote_average: data.vote_average || null,
              genres: data.genres || [],
              mal_id: data.mal_id,
            },
          ])
          .select()
          .single();

        if (insertError) {
          console.error("Error inserting anime:", insertError);
          throw insertError;
        }

        console.log("New anime created:", newAnime);
        animeToUse = newAnime;
      }

      if (!animeToUse || !animeToUse.id) {
        throw new Error("Failed to get or create anime entry");
      }

      console.log("Creating user-anime relationship");
      // Then create the user-anime relationship
      const { error: relationError } = await supabase
        .from("user_anime")
        .insert([
          {
            user_id: userId,
            anime_id: animeToUse.id,
            status: data.status || "completed", // Ensure default status
          },
        ]);

      if (relationError) {
        console.error("Error creating relationship:", relationError);
        throw relationError;
      }

      return animeToUse;
    } catch (error) {
      console.error("Full error in addAnime:", error);
      throw error;
    }
  }

  async deleteAnime(animeId: string, userId: string) {
    const { error } = await supabase
      .from("user_anime")
      .delete()
      .match({ anime_id: animeId, user_id: userId });

    if (error) throw error;
    return true;
  }

  async getAnimeList(userId: string) {
    try {
      console.log("Fetching anime list for user:", userId);

      const { data, error } = await supabase
        .from("anime_list")
        .select(
          `
          id,
          name,
          image_url,
          vote_average,
          genres,
          mal_id,
          user_anime!inner (
            status
          )
        `
        )
        .eq("user_anime.user_id", userId);

      if (error) {
        console.error("Error fetching anime list:", error);
        throw error;
      }

      // Transform the data to match our AnimeItem interface
      return data.map((anime: any) => ({
        id: anime.id,
        name: anime.name,
        image_url: anime.image_url,
        vote_average: anime.vote_average,
        genres: (anime.genres || [])
          .map((g: { name: string }) => g.name)
          .join(", "),
        status: anime.user_anime[0].status,
        mal_id: anime.mal_id,
      }));
    } catch (error) {
      console.error("Error in getAnimeList:", error);
      throw error;
    }
  }

  async updateAnimeStatus(animeId: string, userId: string, status: string) {
    const { error } = await supabase
      .from("user_anime")
      .update({ status })
      .match({ anime_id: animeId, user_id: userId });

    if (error) throw error;
    return true;
  }

  async updateAnime(
    animeId: string,
    userId: string,
    updateData: Partial<CreateAnimeDTO>
  ) {
    const { data, error } = await supabase
      .from("anime_list")
      .update(updateData)
      .match({ id: animeId, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createUser(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (error) throw error;
    return data;
  }
}

export const supabaseService = new SupabaseService();
export { supabase };
