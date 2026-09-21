export type MarketplaceTransaction = {
  id: string;
  transaction_number: string;

  listing_id: string;
  offer_id: string | null;

  buyer_id: string;
  seller_id: string;

  agreed_price: string;
  currency: string;
  quantity: number;

  status: string;

  buyer_confirmed_at: string | null;
  seller_confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;

  created_at: string;
};