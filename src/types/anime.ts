export type AnimeStatus =
  | "watching"
  | "completed"
  | "plan_to_watch"
  | "dropped";

export interface Genre {
  name: string;
}

export interface CreateAnimeDTO {
  name: string;
  image_url: string;
  vote_average: number | null;
  status: AnimeStatus;
  genres: Genre[];
}

export interface AnimeItem {
  id: string;
  name: string;
  vote_average: number | null;
  image_url: string;
  genres: string;
  status: AnimeStatus;
}
