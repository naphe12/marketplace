import csv
from datetime import datetime, time, timezone
from io import StringIO
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response
from sqlalchemy import String, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.dependencies import get_current_admin
from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.billing import BillingPayment
from app.models.billing import BillingOrder
from app.models.country import Country
from app.models.administrative_area import AdministrativeArea
from app.models.category import Category, CategoryAttribute
from app.models.listing import Listing, ListingAttributeValue
from app.models.moderation import FraudSignal, ModerationAction, Report
from app.models.notification import Notification
from app.models.publication import ListingPackage
from app.models.transaction import Transaction
from app.models.review import Review
from app.models.user import User
from app.models.verification import UserVerification
from app.schemas.admin import (
    AdminActionRequest,
    AdminAdministrativeAreaCreate,
    AdminAdministrativeAreaResponse,
    AdminAdministrativeAreaUpdate,
    AdminAuditLogListResponse,
    AdminBillingListResponse,
    AdminCategoryAttributeUpdate,
    AdminCategoryCreate,
    AdminCategoryDetailResponse,
    AdminCategoryUpdate,
    AdminCountryUpdate,
    AdminCountryResponse,
    AdminCountryCreate,
    AdminDashboardResponse,
    AdminFraudSignalActionRequest,
    AdminFraudSignalListResponse,
    AdminListingDetailResponse,
    AdminListingListResponse,
    AdminListingPackageCreate,
    AdminListingPackageResponse,
    AdminListingPackageUpdate,
    AdminListingResponse,
    AdminNotificationCreate,
    AdminReportListResponse,
    AdminReportReviewRequest,
    AdminReviewListResponse,
    AdminSearchResponse,
    AdminTransactionListResponse,
    AdminUser360Response,
    AdminUserListResponse,
    AdminUserResponse,
    AdminVerificationListResponse,
    AdminVerificationReviewRequest,
)
from app.services.storage_service import StorageService
from app.schemas.settings import MarketplaceSettingsResponse, MarketplaceSettingsUpdate
from app.services.settings_service import SettingsService
from app.repositories.settings_repository import SettingsRepository
from app.schemas.category import (
    CategoryAttributeCreate,
    CategoryAttributeResponse,
    CategoryResponse,
)
from app.services.moderation_service import ModerationService
from app.services.verification_service import VerificationService
from app.models import listing


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


def apply_values(target, values: dict):
    for key, value in values.items():
        setattr(target, key, value)


def csv_response(filename: str, rows: list[dict]) -> Response:
    buffer = StringIO()
    fieldnames = list(rows[0].keys()) if rows else ["empty"]
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


async def count(
    db: AsyncSession,
    query,
) -> int:
    result = await db.execute(query)
    return int(result.scalar_one() or 0)


async def write_audit(
    db: AsyncSession,
    *,
    actor_user_id: UUID,
    action: str,
    target_type: str,
    target_id: UUID | None = None,
    metadata: dict | None = None,
):
    db.add(
        AuditLog(
        actor_user_id=actor_user_id,
        action=action,

        # Colonnes historiques
        entity_type=target_type,
        entity_id=target_id,

        # Colonnes actuelles
        target_type=target_type,
        target_id=target_id,
        metadata_json=metadata,
    )
    )


@router.get(
    "/dashboard",
    response_model=AdminDashboardResponse,
)
async def dashboard(
    country_code: str | None = Query(default=None, min_length=2, max_length=2),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    today_start = datetime.combine(
        datetime.now(timezone.utc).date(),
        time.min,
        tzinfo=timezone.utc,
    )
    normalized_country = country_code.upper() if country_code else None
    dashboard_currency = "BIF"

    if normalized_country:
        country = await db.scalar(
            select(Country).where(Country.code == normalized_country)
        )
        if country:
            dashboard_currency = country.currency

    user_filters = [User.deleted_at.is_(None)]
    listing_filters = [Listing.deleted_at.is_(None)]
    transaction_query = select(func.count(Transaction.id))
    billing_query = (
        select(func.coalesce(func.sum(BillingPayment.amount), 0))
        .join(User, User.id == BillingPayment.user_id)
        .where(BillingPayment.status == "PAID")
        .where(BillingPayment.paid_at >= today_start)
    )

    if normalized_country:
        user_filters.append(User.country_code == normalized_country)
        listing_filters.append(Listing.country_code == normalized_country)
        transaction_query = transaction_query.join(
            Listing,
            Listing.id == Transaction.listing_id,
        ).where(Listing.country_code == normalized_country)
        billing_query = billing_query.where(User.country_code == normalized_country)

    paid_today = await db.execute(billing_query)

    def user_count(*extra):
        return select(func.count(User.id)).where(*user_filters, *extra)

    def listing_count(*extra):
        return select(func.count(Listing.id)).where(*listing_filters, *extra)

    async def transaction_count(*extra):
        query = transaction_query.where(*extra)
        return await count(db, query)

    return {
        "users": {
            "total": await count(db, user_count()),
            "new_today": await count(db, user_count(User.created_at >= today_start)),
            "verified": await count(db, user_count(User.phone_verified.is_(True))),
            "suspended": await count(db, user_count(User.status == "SUSPENDED")),
        },
        "listings": {
            "total": await count(db, listing_count()),
            "active": await count(db, listing_count(Listing.status == "ACTIVE")),
            "draft": await count(db, listing_count(Listing.status == "DRAFT")),
            "pending_payment": await count(db, listing_count(Listing.status == "PENDING_PAYMENT")),
            "suspended": await count(db, listing_count(Listing.status == "SUSPENDED")),
        },
        "transactions": {
            "total": await transaction_count(),
            "completed": await transaction_count(Transaction.status == "COMPLETED"),
            "cancelled": await transaction_count(Transaction.status == "CANCELLED"),
        },
        "moderation": {
            "reports_pending": await count(db, select(func.count(Report.id)).where(Report.status == "PENDING")),
            "fraud_signals_open": await count(db, select(func.count(FraudSignal.id)).where(FraudSignal.status == "OPEN")),
            "verifications_pending": await count(db, select(func.count(UserVerification.id)).where(UserVerification.status == "PENDING")),
        },
        "billing": {
            "paid_today": paid_today.scalar_one() or 0,
            "currency": dashboard_currency,
        },
    }


@router.get("/settings", response_model=MarketplaceSettingsResponse)
async def admin_get_settings(
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    return await SettingsRepository.get(db)


@router.patch("/settings", response_model=MarketplaceSettingsResponse)
async def admin_update_settings(
    data: MarketplaceSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    settings = await SettingsService.update(db, admin.id, data)
    await write_audit(
        db,
        actor_user_id=admin.id,
        action="SETTINGS_PUBLICATION_UPDATED",
        target_type="SETTINGS",
        metadata=data.model_dump(exclude_unset=True),
    )
    await db.commit()
    return settings


@router.get("/listing-packages", response_model=list[AdminListingPackageResponse])
async def admin_listing_packages(
    country_code: str | None = Query(default=None, min_length=2, max_length=2),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    query = select(ListingPackage)
    if country_code:
        query = query.where(ListingPackage.country_code == country_code.upper())
    result = await db.execute(
        query.order_by(ListingPackage.country_code, ListingPackage.sort_order, ListingPackage.duration_days)
    )
    return list(result.scalars().all())


@router.post("/listing-packages", response_model=AdminListingPackageResponse, status_code=201)
async def admin_create_listing_package(
    data: AdminListingPackageCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    country_code = data.country_code.upper()
    country = await db.scalar(select(Country).where(Country.code == country_code))
    if not country:
        raise HTTPException(404, "Pays introuvable.")

    package = ListingPackage(
        code=data.code,
        country_code=country_code,
        name=data.name,
        duration_days=data.duration_days,
        price=data.price,
        currency=(data.currency or country.currency).upper(),
        active=data.active,
        sort_order=data.sort_order,
    )
    db.add(package)
    await db.flush()
    await write_audit(
        db,
        actor_user_id=admin.id,
        action="LISTING_PACKAGE_CREATED",
        target_type="LISTING_PACKAGE",
        target_id=package.id,
        metadata={"code": package.code, "price": str(package.price)},
    )
    await db.commit()
    await db.refresh(package)
    return package


@router.patch("/listing-packages/{package_id}", response_model=AdminListingPackageResponse)
async def admin_update_listing_package(
    package_id: UUID,
    data: AdminListingPackageUpdate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    package = await db.get(ListingPackage, package_id)
    if not package:
        raise HTTPException(404, "Package introuvable.")
    previous = {"price": str(package.price), "active": package.active}
    values = data.model_dump(exclude_unset=True)
    if "country_code" in values and values["country_code"]:
        values["country_code"] = values["country_code"].upper()
        country = await db.scalar(select(Country).where(Country.code == values["country_code"]))
        if not country:
            raise HTTPException(404, "Pays introuvable.")
        if "currency" not in values or not values["currency"]:
            values["currency"] = country.currency
    if "currency" in values and values["currency"]:
        values["currency"] = values["currency"].upper()
    apply_values(package, values)
    await write_audit(
        db,
        actor_user_id=admin.id,
        action="LISTING_PACKAGE_UPDATED",
        target_type="LISTING_PACKAGE",
        target_id=package.id,
        metadata={"previous": previous, "changes": {k: str(v) for k, v in values.items()}},
    )
    await db.commit()
    await db.refresh(package)
    return package




@router.get("/countries", response_model=list[AdminCountryResponse])
async def admin_countries(
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    result = await db.execute(
        select(Country).order_by(Country.sort_order.asc(), Country.name.asc())
    )
    return list(result.scalars().all())


@router.post("/countries", response_model=AdminCountryResponse, status_code=201)
async def admin_create_country(
    data: AdminCountryCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    country = Country(
        code=data.code.upper(),
        name=data.name,
        currency=(data.currency or country.currency).upper(),
        phone_prefix=data.phone_prefix,
        default_language=data.default_language.lower(),
        active=data.active,
        sort_order=data.sort_order,
    )
    db.add(country)
    await db.flush()
    await write_audit(
        db,
        actor_user_id=admin.id,
        action="COUNTRY_CREATED",
        target_type="COUNTRY",
        target_id=country.id,
        metadata={"code": country.code, "active": country.active},
    )
    await db.commit()
    await db.refresh(country)
    return country


@router.patch("/countries/{country_id}", response_model=AdminCountryResponse)
async def admin_update_country(
    country_id: UUID,
    data: AdminCountryUpdate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    country = await db.get(Country, country_id)
    if not country:
        raise HTTPException(404, "Pays introuvable.")
    values = data.model_dump(exclude_unset=True)
    if "currency" in values and values["currency"]:
        values["currency"] = values["currency"].upper()
    if "default_language" in values and values["default_language"]:
        values["default_language"] = values["default_language"].lower()
    previous = {"active": country.active, "currency": country.currency}
    apply_values(country, values)
    await write_audit(
        db,
        actor_user_id=admin.id,
        action="COUNTRY_UPDATED",
        target_type="COUNTRY",
        target_id=country.id,
        metadata={"previous": previous, "changes": values},
    )
    await db.commit()
    await db.refresh(country)
    return country


@router.get("/categories", response_model=list[AdminCategoryDetailResponse])
async def admin_categories(
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    result = await db.execute(
        select(Category)
        .options(selectinload(Category.attributes))
        .order_by(Category.sort_order, Category.name)
    )
    categories = list(result.scalars().all())
    return [
        {
            **CategoryResponse.model_validate(category).model_dump(),
            "attributes": category.attributes,
        }
        for category in categories
    ]


@router.post("/categories", response_model=CategoryResponse, status_code=201)
async def admin_create_category(
    data: AdminCategoryCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    category = Category(
        name=data.name,
        slug=data.slug.lower(),
        description=data.description,
        icon=data.icon,
        parent_id=data.parent_id,
        active=data.active,
        sort_order=data.sort_order,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.patch("/categories/{category_id}", response_model=CategoryResponse)
async def admin_update_category(
    category_id: UUID,
    data: AdminCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(404, "Catégorie introuvable.")
    values = data.model_dump(exclude_unset=True)
    if "slug" in values and values["slug"]:
        values["slug"] = values["slug"].lower()
    apply_values(category, values)
    await db.commit()
    await db.refresh(category)
    return category


@router.post("/categories/{category_id}/attributes", response_model=CategoryAttributeResponse, status_code=201)
async def admin_create_category_attribute(
    category_id: UUID,
    data: CategoryAttributeCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    if not await db.get(Category, category_id):
        raise HTTPException(404, "Catégorie introuvable.")
    attribute = CategoryAttribute(
        category_id=category_id,
        name=data.name,
        code=data.code.lower(),
        data_type=data.data_type.upper(),
        required=data.required,
        filterable=data.filterable,
        searchable=data.searchable,
        options=data.options,
        sort_order=data.sort_order,
    )
    db.add(attribute)
    await db.commit()
    await db.refresh(attribute)
    return attribute


@router.patch("/category-attributes/{attribute_id}", response_model=CategoryAttributeResponse)
async def admin_update_category_attribute(
    attribute_id: UUID,
    data: AdminCategoryAttributeUpdate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    attribute = await db.get(CategoryAttribute, attribute_id)
    if not attribute:
        raise HTTPException(404, "Attribut introuvable.")
    values = data.model_dump(exclude_unset=True)
    if "code" in values and values["code"]:
        values["code"] = values["code"].lower()
    if "data_type" in values and values["data_type"]:
        values["data_type"] = values["data_type"].upper()
    apply_values(attribute, values)
    await db.commit()
    await db.refresh(attribute)
    return attribute


@router.delete("/category-attributes/{attribute_id}", status_code=204)
async def admin_delete_category_attribute(
    attribute_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    attribute = await db.get(CategoryAttribute, attribute_id)
    if not attribute:
        raise HTTPException(404, "Attribut introuvable.")
    used = await count(
        db,
        select(func.count(ListingAttributeValue.id))
        .where(ListingAttributeValue.attribute_id == attribute_id),
    )
    if used:
        raise HTTPException(409, "Cet attribut est déjà utilisé par des annonces.")
    await db.delete(attribute)
    await db.commit()




def parse_optional_decimal(value):
    if value is None or str(value).strip() == "":
        return None
    return Decimal(str(value).strip())


def parse_csv_bool(value, default=True) -> bool:
    if value is None or str(value).strip() == "":
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "y", "oui", "actif", "active"}


@router.get("/administrative-areas/export")
async def admin_export_administrative_areas(
    country_code: str = Query(min_length=2, max_length=2),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    normalized_country = country_code.upper()
    result = await db.execute(
        select(AdministrativeArea)
        .where(AdministrativeArea.country_code == normalized_country)
        .order_by(AdministrativeArea.area_type, AdministrativeArea.name)
    )
    areas = list(result.scalars().all())
    return csv_response(
        f"administrative-areas-{normalized_country}.csv",
        [
            {
                "id": str(area.id),
                "country_code": area.country_code,
                "name": area.name,
                "area_type": area.area_type,
                "parent_id": str(area.parent_id) if area.parent_id else "",
                "code": area.code or "",
                "latitude": str(area.latitude) if area.latitude is not None else "",
                "longitude": str(area.longitude) if area.longitude is not None else "",
                "active": area.active,
            }
            for area in areas
        ],
    )


@router.post("/administrative-areas/import")
async def admin_import_administrative_areas(
    country_code: str = Query(min_length=2, max_length=2),
    csv_content: str = Body(media_type="text/csv"),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    normalized_country = country_code.upper()
    country = await db.scalar(select(Country).where(Country.code == normalized_country))
    if not country:
        raise HTTPException(404, "Pays introuvable.")

    reader = csv.DictReader(StringIO(csv_content))
    if not reader.fieldnames or "name" not in reader.fieldnames or "area_type" not in reader.fieldnames:
        raise HTTPException(400, "CSV invalide: colonnes requises name, area_type.")

    created = 0
    updated = 0

    for row in reader:
        name = (row.get("name") or "").strip()
        area_type = (row.get("area_type") or "").strip().upper()
        if not name or not area_type:
            continue

        area = None
        row_id = (row.get("id") or "").strip()
        if row_id:
            try:
                area = await db.get(AdministrativeArea, UUID(row_id))
            except ValueError:
                area = None

        if area and area.country_code != normalized_country:
            raise HTTPException(400, f"La zone {area.id} appartient a un autre pays.")

        parent_id = None
        raw_parent_id = (row.get("parent_id") or "").strip()
        if raw_parent_id:
            try:
                parent_id = UUID(raw_parent_id)
            except ValueError as exc:
                raise HTTPException(400, f"parent_id invalide pour {name}.") from exc

        values = {
            "name": name,
            "country_code": normalized_country,
            "area_type": area_type,
            "parent_id": parent_id,
            "code": (row.get("code") or "").strip() or None,
            "latitude": parse_optional_decimal(row.get("latitude")),
            "longitude": parse_optional_decimal(row.get("longitude")),
            "active": parse_csv_bool(row.get("active"), default=True),
        }

        if area:
            apply_values(area, values)
            updated += 1
        else:
            db.add(AdministrativeArea(**values))
            created += 1

    await db.commit()
    return {"created": created, "updated": updated}


@router.get("/administrative-areas", response_model=list[AdminAdministrativeAreaResponse])
async def admin_administrative_areas(
    parent_id: UUID | None = None,
    area_type: str | None = None,
    country_code: str | None = None,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    query = select(AdministrativeArea)
    if parent_id is not None:
        query = query.where(AdministrativeArea.parent_id == parent_id)
    if area_type:
        query = query.where(AdministrativeArea.area_type == area_type.upper())
    if country_code:
        query = query.where(AdministrativeArea.country_code == country_code.upper())
    result = await db.execute(query.order_by(AdministrativeArea.area_type, AdministrativeArea.name))
    return list(result.scalars().all())


@router.post("/administrative-areas", response_model=AdminAdministrativeAreaResponse, status_code=201)
async def admin_create_administrative_area(
    data: AdminAdministrativeAreaCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    area = AdministrativeArea(
        name=data.name,
        country_code=data.country_code.upper(),
        area_type=data.area_type.upper(),
        parent_id=data.parent_id,
        code=data.code,
        latitude=data.latitude,
        longitude=data.longitude,
        active=data.active,
    )
    db.add(area)
    await db.commit()
    await db.refresh(area)
    return area


@router.get("/verifications", response_model=AdminVerificationListResponse)
async def admin_verifications(
    status: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    query = select(UserVerification)
    if status:
        query = query.where(UserVerification.status == status.upper())
    result = await db.execute(query.order_by(UserVerification.submitted_at.desc().nullslast(), UserVerification.created_at.desc()))
    return {"items": list(result.scalars().all())}


@router.get("/verifications/pending", response_model=AdminVerificationListResponse)
async def admin_pending_verifications(
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    result = await db.execute(
        select(UserVerification)
        .where(UserVerification.status == "PENDING")
        .order_by(UserVerification.submitted_at.asc().nullsfirst(), UserVerification.created_at.asc())
    )
    return {"items": list(result.scalars().all())}


@router.post("/verifications/{verification_id}/review")
async def admin_review_verification(
    verification_id: UUID,
    data: AdminVerificationReviewRequest,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    verification = await VerificationService.review(
        db,
        verification_id,
        admin.id,
        data.decision,
        data.reason or data.note,
    )
    await write_audit(
        db,
        actor_user_id=admin.id,
        action=f"VERIFICATION_{data.decision.upper()}",
        target_type="VERIFICATION",
        target_id=verification_id,
        metadata={"note": data.note, "reason": data.reason},
    )
    await db.commit()
    return verification


@router.get("/reports", response_model=AdminReportListResponse)
async def admin_reports(
    status: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    query = select(Report)
    if status:
        query = query.where(Report.status == status.upper())
    result = await db.execute(query.order_by(Report.created_at.desc()))
    return {"items": list(result.scalars().all())}


@router.post("/reports/{report_id}/review")
async def admin_review_report(
    report_id: UUID,
    data: AdminReportReviewRequest,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    report = await ModerationService.review_report(
        db,
        report_id,
        admin.id,
        data.decision,
        data.note,
    )
    await write_audit(
        db,
        actor_user_id=admin.id,
        action=f"REPORT_{data.decision.upper()}",
        target_type="REPORT",
        target_id=report_id,
        metadata={"note": data.note},
    )
    await db.commit()
    return report


@router.get("/fraud-signals", response_model=AdminFraudSignalListResponse)
async def admin_fraud_signals(
    status: str | None = Query(default="OPEN"),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    query = select(FraudSignal)
    if status:
        query = query.where(FraudSignal.status == status.upper())
    result = await db.execute(query.order_by(FraudSignal.risk_score.desc(), FraudSignal.created_at.desc()))
    return {"items": list(result.scalars().all())}


async def change_fraud_signal_status(
    db: AsyncSession,
    admin_id: UUID,
    signal_id: UUID,
    status: str,
    note: str | None,
):
    signal = await db.get(FraudSignal, signal_id)
    if not signal:
        raise HTTPException(404, "Signal anti-fraude introuvable.")
    previous_status = signal.status
    signal.status = status
    signal.reviewed_by_user_id = admin_id
    signal.reviewed_at = datetime.now(timezone.utc)
    db.add(
        ModerationAction(
            admin_user_id=admin_id,
            target_type="FRAUD_SIGNAL",
            target_id=signal.id,
            fraud_signal_id=signal.id,
            action_type=status,
            reason=note or status,
            previous_status=previous_status,
            new_status=status,
        )
    )
    await write_audit(
        db,
        actor_user_id=admin_id,
        action=f"FRAUD_SIGNAL_{status}",
        target_type="FRAUD_SIGNAL",
        target_id=signal.id,
        metadata={"note": note, "previous_status": previous_status, "new_status": status},
    )
    await db.commit()
    await db.refresh(signal)
    return signal


@router.post("/fraud-signals/{signal_id}/reviewed")
async def admin_mark_fraud_reviewed(signal_id: UUID, data: AdminFraudSignalActionRequest, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    return await change_fraud_signal_status(db, admin.id, signal_id, "REVIEWED", data.note)


@router.post("/fraud-signals/{signal_id}/dismiss")
async def admin_dismiss_fraud(signal_id: UUID, data: AdminFraudSignalActionRequest, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    return await change_fraud_signal_status(db, admin.id, signal_id, "DISMISSED", data.note)


@router.post("/fraud-signals/{signal_id}/escalate")
async def admin_escalate_fraud(signal_id: UUID, data: AdminFraudSignalActionRequest, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    return await change_fraud_signal_status(db, admin.id, signal_id, "ESCALATED", data.note)


@router.get("/transactions", response_model=AdminTransactionListResponse)
async def admin_transactions(
    status: str | None = None,
    buyer_id: UUID | None = None,
    seller_id: UUID | None = None,
    listing_id: UUID | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
    format: str = Query(default="json", pattern="^(json|csv)$"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    filters = []
    if status:
        filters.append(Transaction.status == status.upper())
    if buyer_id:
        filters.append(Transaction.buyer_id == buyer_id)
    if seller_id:
        filters.append(Transaction.seller_id == seller_id)
    if listing_id:
        filters.append(Transaction.listing_id == listing_id)
    if created_from:
        filters.append(Transaction.created_at >= created_from)
    if created_to:
        filters.append(Transaction.created_at <= created_to)

    query = select(Transaction).where(*filters).order_by(Transaction.created_at.desc())

    if format == "csv":
        result = await db.execute(query.limit(5000))
        rows = [
            {
                "id": str(item.id),
                "listing_id": str(item.listing_id),
                "buyer_id": str(item.buyer_id),
                "seller_id": str(item.seller_id),
                "offer_id": str(item.offer_id) if item.offer_id else "",
                "status": item.status,
                "created_at": item.created_at.isoformat() if item.created_at else "",
                "completed_at": item.completed_at.isoformat() if item.completed_at else "",
            }
            for item in result.scalars().all()
        ]
        return csv_response("transactions.csv", rows)

    result = await db.execute(query.offset(offset).limit(limit))
    return {"items": list(result.scalars().all())}


@router.get("/reviews", response_model=AdminReviewListResponse)
async def admin_reviews(
    status: str | None = None,
    reviewer_id: UUID | None = None,
    reviewed_user_id: UUID | None = None,
    transaction_id: UUID | None = None,
    rating_min: int | None = Query(default=None, ge=1, le=5),
    rating_max: int | None = Query(default=None, ge=1, le=5),
    created_from: datetime | None = None,
    created_to: datetime | None = None,
    format: str = Query(default="json", pattern="^(json|csv)$"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    filters = []
    if status:
        filters.append(Review.status == status.upper())
    if reviewer_id:
        filters.append(Review.reviewer_id == reviewer_id)
    if reviewed_user_id:
        filters.append(Review.reviewed_user_id == reviewed_user_id)
    if transaction_id:
        filters.append(Review.transaction_id == transaction_id)
    if rating_min is not None:
        filters.append(Review.rating >= rating_min)
    if rating_max is not None:
        filters.append(Review.rating <= rating_max)
    if created_from:
        filters.append(Review.created_at >= created_from)
    if created_to:
        filters.append(Review.created_at <= created_to)

    query = select(Review).where(*filters).order_by(Review.created_at.desc())

    if format == "csv":
        result = await db.execute(query.limit(5000))
        rows = [
            {
                "id": str(item.id),
                "transaction_id": str(item.transaction_id),
                "reviewer_id": str(item.reviewer_id),
                "reviewed_user_id": str(item.reviewed_user_id),
                "rating": item.rating,
                "status": item.status,
                "comment": item.comment or "",
                "created_at": item.created_at.isoformat() if item.created_at else "",
            }
            for item in result.scalars().all()
        ]
        return csv_response("reviews.csv", rows)

    result = await db.execute(query.offset(offset).limit(limit))
    return {"items": list(result.scalars().all())}


@router.get("/billing", response_model=AdminBillingListResponse)
async def admin_billing(
    status: str | None = None,
    user_id: UUID | None = None,
    listing_id: UUID | None = None,
    order_number: str | None = None,
    provider: str | None = None,
    payment_method: str | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
    paid_from: datetime | None = None,
    paid_to: datetime | None = None,
    format: str = Query(default="json", pattern="^(json|csv)$"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    filters = []
    if status:
        filters.append(BillingPayment.status == status.upper())
    if user_id:
        filters.append(BillingPayment.user_id == user_id)
    if listing_id:
        filters.append(BillingOrder.listing_id == listing_id)
    if order_number:
        filters.append(BillingOrder.order_number.ilike(f"%{order_number.strip()}%"))
    if provider:
        filters.append(BillingPayment.provider == provider.upper())
    if payment_method:
        filters.append(BillingPayment.payment_method == payment_method.upper())
    if created_from:
        filters.append(BillingPayment.created_at >= created_from)
    if created_to:
        filters.append(BillingPayment.created_at <= created_to)
    if paid_from:
        filters.append(BillingPayment.paid_at >= paid_from)
    if paid_to:
        filters.append(BillingPayment.paid_at <= paid_to)

    query = (
        select(BillingPayment, BillingOrder)
        .join(BillingOrder, BillingOrder.id == BillingPayment.billing_order_id)
        .where(*filters)
        .order_by(BillingPayment.created_at.desc())
    )

    result = await db.execute(
        query.limit(5000) if format == "csv" else query.offset(offset).limit(limit)
    )
    items = []
    for payment, order in result.all():
        items.append(
            {
                "id": payment.id,
                "order_number": order.order_number,
                "user_id": payment.user_id,
                "listing_id": order.listing_id,
                "publication_id": order.publication_id,
                "package_id": None,
                "amount": payment.amount,
                "currency": payment.currency,
                "payment_method": payment.payment_method,
                "provider": payment.provider,
                "external_reference": payment.external_reference,
                "status": payment.status,
                "created_at": payment.created_at,
                "paid_at": payment.paid_at,
            }
        )

    if format == "csv":
        rows = [
            {
                key: (value.isoformat() if hasattr(value, "isoformat") else str(value) if value is not None else "")
                for key, value in item.items()
            }
            for item in items
        ]
        return csv_response("billing_payments.csv", rows)

    return {"items": items}


@router.post("/notifications")
async def admin_send_notification(
    data: AdminNotificationCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    recipient = data.recipient.upper()
    normalized_country = data.country_code.upper() if data.country_code else None

    if recipient == "USER":
        if data.user_id is None:
            raise HTTPException(422, "user_id requis pour un destinataire utilisateur.")
        query = select(User.id).where(User.id == data.user_id, User.deleted_at.is_(None))
        if normalized_country:
            query = query.where(User.country_code == normalized_country)
        result = await db.execute(query)
        user_ids = list(result.scalars().all())
    elif recipient in {"ALL", "GROUP"}:
        query = select(User.id).where(User.deleted_at.is_(None))
        if normalized_country:
            query = query.where(User.country_code == normalized_country)
        result = await db.execute(query)
        user_ids = list(result.scalars().all())
    else:
        raise HTTPException(400, "Destinataire invalide.")

    for user_id in user_ids:
        db.add(
            Notification(
                user_id=user_id,
                notification_type="ADMIN_MESSAGE",
                title=data.title,
                message=data.message,
                data={"country_code": normalized_country} if normalized_country else None,
                status="CREATED",
            )
        )

    await write_audit(
        db,
        actor_user_id=admin.id,
        action="ADMIN_NOTIFICATION_SENT",
        target_type="NOTIFICATION",
        metadata={
            "recipient": recipient,
            "country_code": normalized_country,
            "count": len(user_ids),
            "title": data.title,
        },
    )
    await db.commit()
    return {"sent": len(user_ids)}


@router.get("/audit", response_model=AdminAuditLogListResponse)
async def admin_audit_logs(
    target_type: str | None = None,
    target_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    query = select(AuditLog)

    if target_type:
        query = query.where(AuditLog.target_type == target_type.upper())

    if target_id:
        query = query.where(AuditLog.target_id == target_id)

    result = await db.execute(
        query.order_by(AuditLog.created_at.desc()).limit(200)
    )
    return {"items": list(result.scalars().all())}


@router.get("/search", response_model=AdminSearchResponse)
async def admin_global_search(
    q: str = Query(min_length=2),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    query_text = q.strip()
    pattern = f"%{query_text}%"
    items = []

    user_result = await db.execute(
        select(User)
        .where(or_(User.phone.ilike(pattern), User.email.ilike(pattern)))
        .limit(5)
    )
    for user in user_result.scalars().all():
        items.append({
            "type": "USER",
            "id": user.id,
            "label": user.phone,
            "detail": user.email,
            "url": f"/admin/users/{user.id}",
        })

    listing_result = await db.execute(
        select(Listing)
        .where(or_(Listing.title.ilike(pattern), Listing.id.cast(String).ilike(pattern)))
        .limit(5)
    )
    for listing in listing_result.scalars().all():
        items.append({
            "type": "LISTING",
            "id": listing.id,
            "label": listing.title or "Annonce sans titre",
            "detail": listing.status,
            "url": f"/admin/listings/{listing.id}",
        })

    order_result = await db.execute(
        select(BillingOrder)
        .where(BillingOrder.order_number.ilike(pattern))
        .limit(5)
    )
    for order in order_result.scalars().all():
        items.append({
            "type": "ORDER",
            "id": order.id,
            "label": order.order_number,
            "detail": order.status,
            "url": "/admin/billing",
        })

    transaction_result = await db.execute(
        select(Transaction)
        .where(Transaction.id.cast(String).ilike(pattern))
        .limit(5)
    )
    for transaction in transaction_result.scalars().all():
        items.append({
            "type": "TRANSACTION",
            "id": transaction.id,
            "label": str(transaction.id),
            "detail": transaction.status,
            "url": "/admin/transactions",
        })

    return {"items": items}


async def change_review_status(
    db: AsyncSession,
    admin_id: UUID,
    review_id: UUID,
    status: str,
    reason: str,
):
    review = await db.get(Review, review_id)
    if not review:
        raise HTTPException(404, "Avis introuvable.")
    previous_status = review.status
    review.status = status
    db.add(
        ModerationAction(
            admin_user_id=admin_id,
            target_type="REVIEW",
            target_id=review.id,
            action_type=f"{status}_REVIEW",
            reason=reason,
            previous_status=previous_status,
            new_status=status,
        )
    )
    await write_audit(
        db,
        actor_user_id=admin_id,
        action=f"REVIEW_{status}",
        target_type="REVIEW",
        target_id=review.id,
        metadata={"reason": reason, "previous_status": previous_status, "new_status": status},
    )
    await db.commit()
    await db.refresh(review)
    return review


@router.post("/reviews/{review_id}/hide")
async def admin_hide_review(review_id: UUID, data: AdminActionRequest, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    return await change_review_status(db, admin.id, review_id, "HIDDEN", data.reason)


@router.post("/reviews/{review_id}/restore")
async def admin_restore_review(review_id: UUID, data: AdminActionRequest, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    return await change_review_status(db, admin.id, review_id, "PUBLISHED", data.reason)


@router.patch("/administrative-areas/{area_id}", response_model=AdminAdministrativeAreaResponse)
async def admin_update_administrative_area(
    area_id: UUID,
    data: AdminAdministrativeAreaUpdate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    area = await db.get(AdministrativeArea, area_id)
    if not area:
        raise HTTPException(404, "Localisation introuvable.")
    values = data.model_dump(exclude_unset=True)
    if "area_type" in values and values["area_type"]:
        values["area_type"] = values["area_type"].upper()
    if "country_code" in values and values["country_code"]:
        values["country_code"] = values["country_code"].upper()
    apply_values(area, values)
    await db.commit()
    await db.refresh(area)
    return area


@router.get(
    "/users",
    response_model=AdminUserListResponse,
)
async def list_users(
    q: str | None = None,
    status: str | None = None,
    account_type: str | None = None,
    verified: bool | None = None,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    filters = [User.deleted_at.is_(None)]

    if q:
      search = f"%{q.strip()}%"
      filters.append(or_(User.phone.ilike(search), User.email.ilike(search)))

    if status:
        filters.append(User.status == status.upper())

    if account_type:
        filters.append(User.account_type == account_type.upper())

    if verified is not None:
        filters.append(User.phone_verified.is_(verified))

    total = await count(db, select(func.count(User.id)).where(*filters))

    result = await db.execute(
        select(User)
        .where(*filters)
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    items = list(result.scalars().all())

    return {
        "items": items,
        "total": total,
        "offset": offset,
        "limit": limit,
        "has_more": offset + len(items) < total,
    }


@router.get(
    "/users/{user_id}",
    response_model=AdminUser360Response,
)
async def user_detail(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    user = await db.get(User, user_id)
    if not user or user.deleted_at is not None:
        raise HTTPException(404, "Utilisateur introuvable.")
    response = AdminUser360Response.model_validate(user).model_dump()
    response["listings_count"] = await count(db, select(func.count(Listing.id)).where(Listing.seller_id == user.id))
    response["transactions_count"] = await count(db, select(func.count(Transaction.id)).where(or_(Transaction.buyer_id == user.id, Transaction.seller_id == user.id)))
    response["reviews_count"] = await count(db, select(func.count(Review.id)).where(or_(Review.reviewer_id == user.id, Review.reviewed_user_id == user.id)))
    response["reports_count"] = await count(db, select(func.count(Report.id)).where(or_(Report.reporter_id == user.id, Report.target_id == user.id)))
    response["fraud_signals_count"] = await count(db, select(func.count(FraudSignal.id)).where(FraudSignal.user_id == user.id))
    response["sanctions_count"] = await count(db, select(func.count(ModerationAction.id)).where(ModerationAction.target_type == "USER", ModerationAction.target_id == user.id))
    response["audit_count"] = await count(db, select(func.count(AuditLog.id)).where(AuditLog.target_type == "USER", AuditLog.target_id == user.id))
    return response


async def change_user_status(
    db: AsyncSession,
    admin_id: UUID,
    user_id: UUID,
    status: str,
    action_type: str,
    reason: str,
):
    user = await db.get(User, user_id)
    if not user or user.deleted_at is not None:
        raise HTTPException(404, "Utilisateur introuvable.")

    previous_status = user.status
    user.status = status

    db.add(
        ModerationAction(
            admin_user_id=admin_id,
            target_type="USER",
            target_id=user.id,
            action_type=action_type,
            reason=reason,
            previous_status=previous_status,
            new_status=status,
        )
    )

    db.add(
        Notification(
            user_id=user.id,
            notification_type="ACCOUNT_STATUS_CHANGED",
            title="Statut de votre compte",
            message=f"Votre compte est maintenant {status}.",
            data={"previous_status": previous_status, "new_status": status},
        )
    )
    await write_audit(
        db,
        actor_user_id=admin_id,
        action=action_type,
        target_type="USER",
        target_id=user.id,
        metadata={"reason": reason, "previous_status": previous_status, "new_status": status},
    )

    await db.commit()
    await db.refresh(user)
    return user


@router.post("/users/{user_id}/suspend", response_model=AdminUserResponse)
async def suspend_user(user_id: UUID, data: AdminActionRequest, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    return await change_user_status(db, admin.id, user_id, "SUSPENDED", "SUSPEND_USER", data.reason)


@router.post("/users/{user_id}/block", response_model=AdminUserResponse)
async def block_user(user_id: UUID, data: AdminActionRequest, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    return await change_user_status(db, admin.id, user_id, "BLOCKED", "BLOCK_USER", data.reason)


@router.post("/users/{user_id}/restore", response_model=AdminUserResponse)
async def restore_user(user_id: UUID, data: AdminActionRequest, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    return await change_user_status(db, admin.id, user_id, "ACTIVE", "RESTORE_USER", data.reason)


@router.get(
    "/listings",
    response_model=AdminListingListResponse,
)
async def list_listings(
    q: str | None = None,
    status: str | None = None,
    seller_id: UUID | None = None,
    category_id: UUID | None = None,
    administrative_area_id: UUID | None = None,
    country_code: str | None = None,
    condition: str | None = None,
    price_type: str | None = None,
    allow_offers: bool | None = None,
    price_min: Decimal | None = Query(default=None, ge=0),
    price_max: Decimal | None = Query(default=None, ge=0),
    published_from: datetime | None = None,
    published_to: datetime | None = None,
    expires_from: datetime | None = None,
    expires_to: datetime | None = None,
    sort: str = Query(default="updated_desc"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    filters = [Listing.deleted_at.is_(None)]

    if q:
        search = f"%{q.strip()}%"
        filters.append(
            or_(
                Listing.title.ilike(search),
                Listing.description.ilike(search),
                Listing.id.cast(String).ilike(search),
            )
        )

    if status:
        filters.append(Listing.status == status.upper())

    if seller_id:
        filters.append(Listing.seller_id == seller_id)

    if category_id:
        filters.append(Listing.category_id == category_id)

    if administrative_area_id:
        filters.append(Listing.administrative_area_id == administrative_area_id)

    if country_code:
        filters.append(Listing.country_code == country_code.upper())

    if condition:
        filters.append(Listing.condition == condition.upper())

    if price_type:
        filters.append(Listing.price_type == price_type.upper())

    if allow_offers is not None:
        filters.append(Listing.allow_offers == allow_offers)

    if price_min is not None:
        filters.append(Listing.price >= price_min)

    if price_max is not None:
        filters.append(Listing.price <= price_max)

    if published_from is not None:
        filters.append(Listing.published_at >= published_from)

    if published_to is not None:
        filters.append(Listing.published_at <= published_to)

    if expires_from is not None:
        filters.append(Listing.expires_at >= expires_from)

    if expires_to is not None:
        filters.append(Listing.expires_at <= expires_to)

    total = await count(db, select(func.count(Listing.id)).where(*filters))

    sort_options = {
        "updated_asc": Listing.updated_at.asc(),
        "created_desc": Listing.created_at.desc(),
        "created_asc": Listing.created_at.asc(),
        "published_desc": Listing.published_at.desc().nullslast(),
        "expires_asc": Listing.expires_at.asc().nullslast(),
        "price_desc": Listing.price.desc().nullslast(),
        "price_asc": Listing.price.asc().nullslast(),
    }

    order_by = sort_options.get(sort, Listing.updated_at.desc())

    result = await db.execute(
        select(Listing)
        .options(selectinload(Listing.images))
        .where(*filters)
        .order_by(order_by)
        .offset(offset)
        .limit(limit)
    )

    items = list(result.scalars().all())

    return {
        "items": [AdminListingResponse.model_validate(item) for item in items],
        "total": total,
        "offset": offset,
        "limit": limit,
        "has_more": offset + len(items) < total,
    }


@router.get(
    "/listings/{listing_id}",
    response_model=AdminListingDetailResponse,
)
async def listing_detail(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    result = await db.execute(
        select(Listing)
        .options(selectinload(Listing.images), selectinload(Listing.attribute_values))
        .where(Listing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    if not listing or listing.deleted_at is not None:
        raise HTTPException(404, "Annonce introuvable.")

    response = AdminListingDetailResponse.model_validate(listing).model_dump()
    response["images"] = [
        {
            "id": image.id,
            "image_url": await StorageService.signed_url(image.object_key),
            "thumbnail_url": (
                await StorageService.signed_url(image.thumbnail_object_key)
                if image.thumbnail_object_key else None
            ),
            "position": image.position,
            "is_primary": image.is_primary,
        }
        for image in listing.images
    ]
    response["reports_count"] = await count(db, select(func.count(Report.id)).where(Report.target_type == "LISTING", Report.target_id == listing.id))
    response["fraud_signals_count"] = await count(db, select(func.count(FraudSignal.id)).where(FraudSignal.listing_id == listing.id))
    response["moderation_actions_count"] = await count(db, select(func.count(ModerationAction.id)).where(ModerationAction.target_type == "LISTING", ModerationAction.target_id == listing.id))
    return response


async def change_listing_status(
    db: AsyncSession,
    admin_id: UUID,
    listing_id: UUID,
    status: str,
    action_type: str,
    reason: str,
):
    listing = await db.get(Listing, listing_id)
    if not listing or listing.deleted_at is not None:
        raise HTTPException(404, "Annonce introuvable.")

    previous_status = listing.status
    listing.status = status

    db.add(
        ModerationAction(
            admin_user_id=admin_id,
            target_type="LISTING",
            target_id=listing.id,
            action_type=action_type,
            reason=reason,
            previous_status=previous_status,
            new_status=status,
        )
    )

    db.add(
        Notification(
            user_id=listing.seller_id,
            notification_type="LISTING_STATUS_CHANGED",
            title="Statut de votre annonce",
            message=f"Votre annonce « {listing.title} » est maintenant {status}.",
            data={"listing_id": str(listing.id), "previous_status": previous_status, "new_status": status},
        )
    )
    await write_audit(
        db,
        actor_user_id=admin_id,
        action=action_type,
        target_type="LISTING",
        target_id=listing.id,
        metadata={"reason": reason, "previous_status": previous_status, "new_status": status},
    )

    await db.commit()
    result = await db.execute(
        select(Listing)
        .options(selectinload(Listing.images))
        .where(Listing.id == listing.id)
    )
    return result.scalar_one()


@router.post("/listings/{listing_id}/suspend", response_model=AdminListingResponse)
async def suspend_listing(listing_id: UUID, data: AdminActionRequest, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    return await change_listing_status(db, admin.id, listing_id, "SUSPENDED", "SUSPEND_LISTING", data.reason)


@router.post("/listings/{listing_id}/restore", response_model=AdminListingResponse)
async def restore_listing(listing_id: UUID, data: AdminActionRequest, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    return await change_listing_status(db, admin.id, listing_id, "ACTIVE", "RESTORE_LISTING", data.reason)


@router.post("/listings/{listing_id}/remove", response_model=AdminListingResponse)
async def remove_listing(listing_id: UUID, data: AdminActionRequest, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    return await change_listing_status(db, admin.id, listing_id, "REMOVED", "REMOVE_LISTING", data.reason)


@router.delete("/listings/{listing_id}/images/{image_id}", status_code=204)
async def admin_remove_listing_image(
    listing_id: UUID,
    image_id: UUID,
    data: AdminActionRequest,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    result = await db.execute(
        select(Listing)
        .options(selectinload(Listing.images))
        .where(Listing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    if not listing or listing.deleted_at is not None:
        raise HTTPException(404, "Annonce introuvable.")

    image = next((item for item in listing.images if item.id == image_id), None)
    if image is None:
        raise HTTPException(404, "Photo introuvable.")

    remaining = [item for item in listing.images if item.id != image_id]
    if image.is_primary and remaining:
        for item in remaining:
            item.is_primary = False
        min(remaining, key=lambda item: item.position).is_primary = True

    await write_audit(
        db,
        actor_user_id=admin.id,
        action="LISTING_IMAGE_REMOVED",
        target_type="LISTING_IMAGE",
        target_id=image.id,
        metadata={
            "listing_id": str(listing.id),
            "reason": data.reason,
            "object_key": image.object_key,
        },
    )
    await db.delete(image)
    await db.commit()
