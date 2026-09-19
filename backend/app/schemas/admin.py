from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.category import CategoryAttributeResponse, CategoryResponse
from app.schemas.listing import ListingDetailResponse, ListingImageResponse
from app.schemas.location import AdministrativeAreaResponse
from app.schemas.moderation import FraudSignalResponse, ReportResponse
from app.schemas.review import ReviewResponse
from app.schemas.transaction import TransactionResponse
from app.schemas.verification import VerificationResponse


class AdminUsersMetrics(BaseModel):
    total: int
    new_today: int
    verified: int
    suspended: int


class AdminListingsMetrics(BaseModel):
    total: int
    active: int
    draft: int
    pending_payment: int
    suspended: int


class AdminTransactionsMetrics(BaseModel):
    total: int
    completed: int
    cancelled: int


class AdminModerationMetrics(BaseModel):
    reports_pending: int
    fraud_signals_open: int
    verifications_pending: int


class AdminBillingMetrics(BaseModel):
    paid_today: Decimal
    currency: str


class AdminDashboardResponse(BaseModel):
    users: AdminUsersMetrics
    listings: AdminListingsMetrics
    transactions: AdminTransactionsMetrics
    moderation: AdminModerationMetrics
    billing: AdminBillingMetrics


class AdminUserResponse(BaseModel):
    id: UUID
    phone: str
    email: str | None
    account_type: str
    status: str
    phone_verified: bool
    email_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class AdminUserListResponse(BaseModel):
    items: list[AdminUserResponse]
    total: int
    offset: int
    limit: int
    has_more: bool


class AdminListingResponse(BaseModel):
    id: UUID
    seller_id: UUID
    category_id: UUID
    administrative_area_id: UUID | None
    title: str
    description: str | None
    price: Decimal | None
    currency: str
    price_type: str
    condition: str | None
    quantity: int
    status: str
    allow_offers: bool
    latitude: Decimal | None
    longitude: Decimal | None
    published_at: datetime | None
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime
    images: list[ListingImageResponse] = []

    model_config = ConfigDict(
        from_attributes=True
    )


class AdminListingListResponse(BaseModel):
    items: list[AdminListingResponse]
    total: int
    offset: int
    limit: int
    has_more: bool


class AdminListingDetailResponse(ListingDetailResponse):
    reports_count: int = 0
    fraud_signals_count: int = 0
    moderation_actions_count: int = 0


class AdminActionRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=3000)


class AdminUser360Response(AdminUserResponse):
    listings_count: int = 0
    transactions_count: int = 0
    reviews_count: int = 0
    reports_count: int = 0
    fraud_signals_count: int = 0
    sanctions_count: int = 0
    audit_count: int = 0


class AdminSearchResult(BaseModel):
    type: str
    id: UUID
    label: str
    detail: str | None = None
    url: str


class AdminSearchResponse(BaseModel):
    items: list[AdminSearchResult]


class AdminCategoryUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    parent_id: UUID | None = None
    icon: str | None = None
    description: str | None = None
    active: bool | None = None
    sort_order: int | None = None


class AdminCategoryCreate(BaseModel):
    name: str
    slug: str
    parent_id: UUID | None = None
    icon: str | None = None
    description: str | None = None
    active: bool = True
    sort_order: int = 0


class AdminCategoryDetailResponse(CategoryResponse):
    attributes: list[CategoryAttributeResponse] = []


class AdminCategoryAttributeUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    data_type: str | None = None
    required: bool | None = None
    filterable: bool | None = None
    searchable: bool | None = None
    options: dict | None = None
    sort_order: int | None = None


class AdminAdministrativeAreaCreate(BaseModel):
    name: str
    area_type: str
    parent_id: UUID | None = None
    code: str | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    active: bool = True


class AdminAdministrativeAreaUpdate(BaseModel):
    name: str | None = None
    area_type: str | None = None
    parent_id: UUID | None = None
    code: str | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    active: bool | None = None


class AdminAdministrativeAreaResponse(AdministrativeAreaResponse):
    pass


class AdminVerificationReviewRequest(BaseModel):
    decision: str
    note: str | None = None
    reason: str | None = None


class AdminReportReviewRequest(BaseModel):
    decision: str
    note: str | None = None


class AdminFraudSignalActionRequest(BaseModel):
    note: str | None = None


class AdminVerificationListResponse(BaseModel):
    items: list[VerificationResponse]


class AdminReportListResponse(BaseModel):
    items: list[ReportResponse]


class AdminFraudSignalListResponse(BaseModel):
    items: list[FraudSignalResponse]


class AdminTransactionListResponse(BaseModel):
    items: list[TransactionResponse]


class AdminReviewListResponse(BaseModel):
    items: list[ReviewResponse]


class AdminListingPackageCreate(BaseModel):
    code: str
    name: str
    duration_days: int
    price: Decimal
    currency: str = "BIF"
    active: bool = True
    sort_order: int = 0


class AdminListingPackageUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    duration_days: int | None = None
    price: Decimal | None = None
    currency: str | None = None
    active: bool | None = None
    sort_order: int | None = None


class AdminListingPackageResponse(BaseModel):
    id: UUID
    code: str
    name: str
    duration_days: int
    price: Decimal
    currency: str
    active: bool
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class AdminBillingPaymentRow(BaseModel):
    id: UUID
    order_number: str
    user_id: UUID
    listing_id: UUID | None
    publication_id: UUID | None
    package_id: UUID | None = None
    amount: Decimal
    currency: str
    payment_method: str
    provider: str | None
    external_reference: str | None
    status: str
    created_at: datetime
    paid_at: datetime | None


class AdminBillingListResponse(BaseModel):
    items: list[AdminBillingPaymentRow]


class AdminNotificationCreate(BaseModel):
    title: str
    message: str
    recipient: str = "ALL"
    user_id: UUID | None = None


class AdminAuditLogResponse(BaseModel):
    id: UUID
    actor_user_id: UUID
    action: str
    target_type: str
    target_id: UUID | None
    metadata_json: dict | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminAuditLogListResponse(BaseModel):
    items: list[AdminAuditLogResponse]
