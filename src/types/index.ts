export interface User {
  id: string;
  email: string;
  username: string;
  role: "user" | "admin";
  created_at: string;
}

export interface AnimeItem {
  id: string;
  name: string;
  vote_average: number | null;
  image_url: string;
  created_at: string;
}

export interface UserAnime {
  user_id: string;
  anime_id: string;
  status: "watching" | "completed" | "plan_to_watch" | "dropped";
}

export interface CreateAnimeDTO {
  name: string;
  vote_average: number | null;
  image_url: string;
  status: "watching" | "completed" | "plan_to_watch" | "dropped";
  genres: Array<{ name: string }>;
  mal_id: number;
}
