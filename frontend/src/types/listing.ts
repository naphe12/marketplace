export type ListingImage = {
  id: string;

  image_url: string;
  thumbnail_url: string | null;

  position: number;
  is_primary: boolean;
};


export type Listing = {
  id: string;

  seller_id: string;
  category_id: string;
  administrative_area_id: string | null;

  title: string;

  price: string | null;
  currency: string;
  price_type: string;

  condition: string | null;
  status: string;

  created_at: string;
  published_at: string | null;
  expires_at: string | null;

  images: ListingImage[];

  is_favorite?: boolean;
};


export type ListingSearchResponse = {
  items: Listing[];

  total: number;

  offset: number;
  limit: number;

  has_more: boolean;
};

export type ListingDetail = Listing & {
  description: string | null;
  quantity: number;
  allow_offers: boolean;
  updated_at: string;
};
