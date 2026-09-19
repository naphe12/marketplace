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


export type CategoryAttribute = {
  id: string;
  category_id: string;

  name: string;
  code: string;

  data_type:
    | "STRING"
    | "INTEGER"
    | "DECIMAL"
    | "BOOLEAN"
    | "DATE"
    | "SELECT";

  required: boolean;
  filterable: boolean;
  searchable: boolean;

  options:
    | {
        values?: string[];
      }
    | null;

  sort_order: number;
};