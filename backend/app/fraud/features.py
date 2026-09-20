from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Message
from app.models.listing import Listing
from app.models.moderation import Report
from app.models.offer import Offer
from app.models.transaction import Transaction
from app.models.user import User


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def age_days(value: datetime | None, now: datetime) -> int:
    if not value:
        return 0

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)

    return max((now - value).days, 0)


def text_quality_score(text: str | None) -> dict:
    value = (text or "").strip()
    if not value:
        return {
            "length": 0,
            "uppercase_ratio": 0,
            "digit_ratio": 0,
            "repeated_char_runs": 0,
            "has_external_contact_hint": False,
            "has_urgency_hint": False,
        }

    letters = [char for char in value if char.isalpha()]
    digits = [char for char in value if char.isdigit()]
    uppercase = [char for char in letters if char.isupper()]

    repeated_runs = 0
    previous = ""
    run_length = 0
    for char in value.lower():
        if char == previous:
            run_length += 1
        else:
            if run_length >= 4:
                repeated_runs += 1
            previous = char
            run_length = 1
    if run_length >= 4:
        repeated_runs += 1

    lowered = value.lower()
    contact_markers = {
        "whatsapp",
        "telegram",
        "western union",
        "moneygram",
        "http://",
        "https://",
        "bit.ly",
        "t.me/",
    }
    urgency_markers = {
        "urgent",
        "vite",
        "maintenant",
        "immediat",
        "dernier prix",
    }

    return {
        "length": len(value),
        "uppercase_ratio": (
            len(uppercase) / len(letters)
            if letters
            else 0
        ),
        "digit_ratio": len(digits) / len(value),
        "repeated_char_runs": repeated_runs,
        "has_external_contact_hint": any(
            marker in lowered
            for marker in contact_markers
        ),
        "has_urgency_hint": any(
            marker in lowered
            for marker in urgency_markers
        ),
    }


async def count_scalar(db: AsyncSession, statement) -> int:
    return int((await db.scalar(statement)) or 0)


async def extract_offer_features(
    db: AsyncSession,
    offer: Offer,
    user: User,
    listing: Listing,
) -> dict:
    now = utcnow()
    one_hour_ago = now - timedelta(hours=1)
    one_day_ago = now - timedelta(days=1)
    seven_days_ago = now - timedelta(days=7)

    account_age_days = age_days(user.created_at, now)
    listing_age_days = age_days(listing.created_at, now)

    total_offers = await count_scalar(
        db,
        select(func.count(Offer.id)).where(
            Offer.buyer_id == user.id,
        ),
    )
    offers_last_hour = await count_scalar(
        db,
        select(func.count(Offer.id)).where(
            Offer.buyer_id == user.id,
            Offer.created_at >= one_hour_ago,
        ),
    )
    offers_last_24h = await count_scalar(
        db,
        select(func.count(Offer.id)).where(
            Offer.buyer_id == user.id,
            Offer.created_at >= one_day_ago,
        ),
    )
    distinct_sellers_last_24h = await count_scalar(
        db,
        select(func.count(func.distinct(Offer.seller_id))).where(
            Offer.buyer_id == user.id,
            Offer.created_at >= one_day_ago,
        ),
    )

    seller_active_listings_7d = await count_scalar(
        db,
        select(func.count(Listing.id)).where(
            Listing.seller_id == listing.seller_id,
            Listing.created_at >= seven_days_ago,
            Listing.deleted_at.is_(None),
        ),
    )

    buyer_confirmed_reports = await count_scalar(
        db,
        select(func.count(Report.id)).where(
            Report.target_type == "USER",
            Report.target_id == user.id,
            Report.status == "CONFIRMED",
        ),
    )
    seller_confirmed_reports = await count_scalar(
        db,
        select(func.count(Report.id)).where(
            Report.target_type == "USER",
            Report.target_id == listing.seller_id,
            Report.status == "CONFIRMED",
        ),
    )
    listing_reports_pending = await count_scalar(
        db,
        select(func.count(Report.id)).where(
            Report.target_type == "LISTING",
            Report.target_id == listing.id,
            Report.status == "PENDING",
        ),
    )

    completed_transactions = await count_scalar(
        db,
        select(func.count(Transaction.id)).where(
            Transaction.buyer_id == user.id,
            Transaction.status == "COMPLETED",
        ),
    )
    cancelled_transactions = await count_scalar(
        db,
        select(func.count(Transaction.id)).where(
            Transaction.buyer_id == user.id,
            Transaction.status == "CANCELLED",
        ),
    )

    conversation_message_count = await count_scalar(
        db,
        select(func.count(Message.id)).where(
            Message.conversation_id == offer.conversation_id,
        ),
    )
    buyer_message_count = await count_scalar(
        db,
        select(func.count(Message.id)).where(
            Message.conversation_id == offer.conversation_id,
            Message.sender_id == user.id,
        ),
    )

    last_buyer_message = await db.scalar(
        select(Message.content)
        .where(
            Message.conversation_id == offer.conversation_id,
            Message.sender_id == user.id,
        )
        .order_by(Message.created_at.desc())
        .limit(1)
    )

    offer_amount = float(offer.amount)
    listing_price = (
        float(listing.price)
        if listing.price is not None
        else None
    )
    offer_ratio = (
        offer_amount / listing_price
        if listing_price and listing_price > 0
        else None
    )

    cancellation_ratio = (
        cancelled_transactions
        / max(completed_transactions + cancelled_transactions, 1)
    )

    buyer_trust_score = 0
    if user.phone_verified:
        buyer_trust_score += 20
    if user.email_verified:
        buyer_trust_score += 10
    buyer_trust_score += min(account_age_days, 30)
    buyer_trust_score += min(completed_transactions * 10, 30)
    buyer_trust_score -= min(buyer_confirmed_reports * 25, 60)
    buyer_trust_score = max(min(buyer_trust_score, 100), 0)

    return {
        "account_age_days": account_age_days,
        "listing_age_days": listing_age_days,
        "total_offers": total_offers,
        "offers_last_hour": offers_last_hour,
        "offers_last_24h": offers_last_24h,
        "distinct_sellers_last_24h": distinct_sellers_last_24h,
        "seller_active_listings_7d": seller_active_listings_7d,
        "buyer_confirmed_reports": buyer_confirmed_reports,
        "seller_confirmed_reports": seller_confirmed_reports,
        "listing_reports_pending": listing_reports_pending,
        "confirmed_reports": buyer_confirmed_reports,
        "completed_transactions": completed_transactions,
        "cancelled_transactions": cancelled_transactions,
        "cancellation_ratio": cancellation_ratio,
        "conversation_message_count": conversation_message_count,
        "buyer_message_count": buyer_message_count,
        "last_buyer_message_quality": text_quality_score(last_buyer_message),
        "offer_amount": offer_amount,
        "listing_price": listing_price,
        "offer_to_listing_ratio": offer_ratio,
        "phone_verified": bool(user.phone_verified),
        "email_verified": bool(user.email_verified),
        "buyer_trust_score": buyer_trust_score,
    }
