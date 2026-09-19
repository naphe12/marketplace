export type AdministrativeArea = {
  id: string;

  parent_id: string | null;

  name: string;
  area_type: string;

  code: string | null;

  latitude: number | null;
  longitude: number | null;

  active: boolean;
};