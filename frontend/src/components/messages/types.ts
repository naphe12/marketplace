export type Conversation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  last_message_at: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: string;
  content: string;
  read_at: string | null;
  created_at: string;
};
