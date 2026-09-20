import type {
  FraudAction,
  FraudLabel,
  FraudReason,
  FraudRiskLevel,
  FraudSource,
} from "../types/fraud";


export type AdminDashboard = {
  users: {
    total: number;
    new_today: number;
    verified: number;
    suspended: number;
  };
  listings: {
    total: number;
    active: number;
    draft: number;
    pending_payment: number;
    suspended: number;
  };
  transactions: {
    total: number;
    completed: number;
    cancelled: number;
  };
  moderation: {
    reports_pending: number;
    fraud_signals_open: number;
    verifications_pending: number;
  };
  billing: {
    paid_today: string;
    currency: string;
  };
};

export type AdminUser = {
  id: string;
  phone: string;
  email: string | null;
  account_type: string;
  status: string;
  phone_verified: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminUser360 = AdminUser & {
  listings_count: number;
  transactions_count: number;
  reviews_count: number;
  reports_count: number;
  fraud_signals_count: number;
  sanctions_count: number;
  audit_count: number;
};

export type AdminListResponse<T> = {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
};

export type AdminListing = {
  id: string;
  seller_id: string;
  category_id: string;
  administrative_area_id: string | null;
  title: string;
  description: string | null;
  price: string | null;
  currency: string;
  price_type: string;
  condition: string | null;
  quantity: number;
  status: string;
  allow_offers: boolean;
  latitude: string | null;
  longitude: string | null;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminCategoryAttribute = {
  id: string;
  category_id: string;
  name: string;
  code: string;
  data_type: string;
  required: boolean;
  filterable: boolean;
  searchable: boolean;
  options: { values?: string[] } | null;
  sort_order: number;
};

export type AdminCategory = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  active: boolean;
  sort_order: number;
  attributes: AdminCategoryAttribute[];
};

export type AdminArea = {
  id: string;
  parent_id: string | null;
  name: string;
  area_type: string;
  code: string | null;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
};

export type AdminVerification = {
  id: string;
  user_id: string;
  verification_type: string;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
};

export type AdminReport = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string | null;
  status: string;
  priority: string;
  reviewed_at: string | null;
  resolution_note: string | null;
  created_at: string;
};




export type AdminFraudSignal = {
  id: string;

  user_id: string | null;
  listing_id: string | null;

  signal_type: string;

  risk_score:
    | string
    | number
    | null;

  severity: string;
  status: string;

  // Ancien champ existant
  signal_data:
    | Record<string, unknown>
    | null;

  // Fraud Engine v1
  risk_level?:
    | FraudRiskLevel
    | null;

  source?:
    | FraudSource
    | null;

  action?:
    | FraudAction
    | null;

  model_version?:
    | string
    | null;

  features?:
    | Record<string, unknown>
    | null;

  reasons?:
    | FraudReason[]
    | null;

  admin_label?:
    | FraudLabel
    | null;

  reviewed_by_user_id?:
    | string
    | null;

  reviewed_at?:
    | string
    | null;

  created_at: string;
};

export type AdminTransaction = {
  id: string;
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

export type AdminReview = {
  id: string;
  transaction_id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  rating: number;
  comment: string | null;
  status: string;
  created_at: string;
};

export type AdminSettings = {
  id: string;
  listing_payment_enabled: boolean;
  free_listing_duration_days: number;
};

export type AdminListingPackage = {
  id: string;
  code: string;
  name: string;
  duration_days: number;
  price: string;
  currency: string;
  active: boolean;
  sort_order: number;
};

export type AdminBillingPayment = {
  id: string;
  order_number: string;
  user_id: string;
  listing_id: string | null;
  publication_id: string | null;
  package_id: string | null;
  amount: string;
  currency: string;
  payment_method: string;
  provider: string | null;
  external_reference: string | null;
  status: string;
  created_at: string;
  paid_at: string | null;
};

export type AdminAuditLog = {
  id: string;
  actor_user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

export type AdminSearchResult = {
  type: string;
  id: string;
  label: string;
  detail: string | null;
  url: string;
};
