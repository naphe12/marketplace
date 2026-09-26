export type ReputationProfile = {
  user_id: string;
  trust_score: string;
  trust_level: string;
  completed_transactions: number;
  completed_as_buyer: number;
  completed_as_seller: number;
  cancelled_transactions: number;
  review_count: number;
  average_rating: string | null;
  phone_verified: boolean;
  identity_verified: boolean;
  business_verified: boolean;
};

export type UserReview = {
  id: string;
  transaction_id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  rating: number;
  comment: string | null;
  status: string;
  created_at: string;
};
