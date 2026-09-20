export type ConversationOffer = {
  id: string;
  conversation_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;

  amount: string;
  currency: string;

  status:
    | "PENDING"
    | "ACCEPTED"
    | "REJECTED"
    | "CANCELLED";

  responded_at: string | null;
  created_at: string;
};