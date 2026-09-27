export type Country = {
  code: string;
  name: string;
  currency: string;
  phone_prefix: string | null;
  default_language: string;
  active: boolean;
  sort_order: number;
};

export type AdministrativeArea = {
  id: string;

  parent_id: string | null;
  country_code: string;

  name: string;
  area_type: string;

  code: string | null;

  latitude: number | null;
  longitude: number | null;

  active: boolean;
};