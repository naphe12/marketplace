export type MarketplaceDelivery = {
  id: string;
  transaction_id: string;
  requested_by_user_id: string;
  carrier_name: string | null;
  pickup_address: string;
  dropoff_address: string;
  fee_amount: string;
  currency: string;
  status: string;
  tracking_reference: string | null;
  proof_url: string | null;
  dispute_reason: string | null;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  disputed_at: string | null;
  created_at: string;
};

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
  delivery: MarketplaceDelivery | null;

  created_at: string;
};