export type SavedSearch = {
  id: string;
  user_id: string;
  name: string;
  query_params: Record<string, string>;
  alerts_enabled: boolean;
  created_at: string;
  updated_at: string;
};
