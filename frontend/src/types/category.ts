export type Category = {
  id: string;
  parent_id: string | null;

  name: string;
  slug: string;

  description: string | null;
  icon: string | null;

  active: boolean;
  sort_order: number;
};