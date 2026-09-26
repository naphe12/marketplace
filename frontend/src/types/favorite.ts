import type { Listing } from "./listing";

export type FavoriteFolder = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type FavoriteItem = {
  listing: Listing;
  folder_id: string | null;
  favorited_at: string;
};
