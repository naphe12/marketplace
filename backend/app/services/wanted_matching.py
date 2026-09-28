import math
import re
import unicodedata
from decimal import Decimal
from uuid import UUID

from app.models.listing import Listing, ListingAttributeValue
from app.models.wanted import WantedRequest, WantedRequestAttribute


TOKEN_ALIASES = {
    "iphone": {"apple", "ios"},
    "apple": {"iphone", "macbook", "ipad", "ios"},
    "telephone": {"phone", "smartphone", "mobile", "simu"},
    "phone": {"telephone", "smartphone", "mobile"},
    "smartphone": {"telephone", "phone", "mobile"},
    "ordinateur": {"computer", "laptop", "pc", "portable"},
    "laptop": {"ordinateur", "pc", "portable"},
    "portable": {"laptop", "ordinateur", "mobile"},
    "voiture": {"car", "auto", "vehicle", "vehicule"},
    "automatique": {"automatic", "auto"},
    "automatic": {"automatique", "auto"},
    "neuf": {"nouveau", "new", "excellent"},
    "comme": {"excellent", "neuf"},
    "recent": {"nouveau", "new", "2024", "2023", "2022"},
    "gb": {"go", "giga"},
    "go": {"gb", "giga"},
}

STOP_WORDS = {
    "je", "cherche", "recherche", "un", "une", "des", "de", "du", "la", "le", "les", "pour", "avec", "sans",
    "et", "ou", "a", "à", "au", "aux", "en", "sur", "moins", "maximum", "max", "minimum", "min", "besoin",
    "ndiko", "ndarondera", "natafuta", "kwa", "ya", "na", "the", "a", "an", "for", "with", "without",
}


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = normalized.lower().replace("256gb", "256 gb").replace("256go", "256 go")
    return re.sub(r"[^a-z0-9]+", " ", normalized).strip()


def tokens(value: str | None) -> set[str]:
    raw_tokens = {item for item in normalize_text(value).split() if item and item not in STOP_WORDS}
    expanded = set(raw_tokens)
    for token in raw_tokens:
        expanded.update(TOKEN_ALIASES.get(token, set()))
    return expanded


def text_similarity(left: str | None, right: str | None) -> float:
    left_tokens = tokens(left)
    right_tokens = tokens(right)
    if not left_tokens or not right_tokens:
        return 0.0
    overlap = len(left_tokens & right_tokens)
    return overlap / math.sqrt(len(left_tokens) * len(right_tokens))


def price_score(request: WantedRequest, listing: Listing) -> float:
    if listing.price is None:
        return 0.45
    price = Decimal(listing.price)
    if request.budget_min is not None and price < request.budget_min:
        return 0.35
    if request.budget_max is None:
        return 0.75
    if price <= request.budget_max:
        if request.budget_max == 0:
            return 1.0
        ratio = float(price / request.budget_max)
        return max(0.65, min(1.0, 1.08 - (ratio * 0.18)))
    over_ratio = float((price - request.budget_max) / request.budget_max) if request.budget_max else 1.0
    return max(0.0, 0.55 - over_ratio)


def location_score(request: WantedRequest, listing: Listing) -> float:
    if request.country_code and listing.country_code != request.country_code:
        return 0.0
    if request.administrative_area_id and listing.administrative_area_id == request.administrative_area_id:
        return 1.0
    return 0.75


def _attribute_value(value: WantedRequestAttribute | ListingAttributeValue):
    return (
        value.value_text
        if value.value_text is not None
        else value.value_integer
        if value.value_integer is not None
        else value.value_decimal
        if value.value_decimal is not None
        else value.value_boolean
        if value.value_boolean is not None
        else value.value_date
    )


def attributes_score(request_attributes: list[WantedRequestAttribute], listing_values: list[ListingAttributeValue]) -> float:
    if not request_attributes:
        return 0.65
    listing_by_attribute: dict[UUID, ListingAttributeValue] = {item.attribute_id: item for item in listing_values}
    scores: list[float] = []
    for wanted_attribute in request_attributes:
        listing_value = listing_by_attribute.get(wanted_attribute.attribute_id)
        if not listing_value:
            scores.append(0.0)
            continue
        wanted_value = _attribute_value(wanted_attribute)
        actual_value = _attribute_value(listing_value)
        if wanted_value is None or actual_value is None:
            scores.append(0.0)
        elif isinstance(wanted_value, str) or isinstance(actual_value, str):
            scores.append(text_similarity(str(wanted_value), str(actual_value)))
        else:
            scores.append(1.0 if wanted_value == actual_value else 0.0)
    return sum(scores) / len(scores)


def hard_constraints_pass(request: WantedRequest, listing: Listing) -> bool:
    if request.category_id and listing.category_id != request.category_id:
        return False
    if request.country_code and listing.country_code != request.country_code:
        return False
    if request.budget_max is not None and listing.price is not None and listing.price > request.budget_max:
        return False
    if request.condition and listing.condition and listing.condition != request.condition.upper():
        return False
    return True


# Later, replace text_similarity with pgvector cosine similarity without changing callers.
def hybrid_match_score(request: WantedRequest, listing: Listing, semantic_override: float | None = None) -> int:
    if not hard_constraints_pass(request, listing):
        return 0
    request_text = f"{request.title} {request.description or ''}"
    listing_text = f"{listing.title} {listing.description or ''}"
    semantic = semantic_override if semantic_override is not None else text_similarity(request_text, listing_text)
    price = price_score(request, listing)
    location = location_score(request, listing)
    condition = 1.0 if not request.condition or listing.condition == request.condition.upper() else 0.25
    attrs = attributes_score(list(request.attributes or []), list(listing.attribute_values or []))
    category = 1.0 if not request.category_id or listing.category_id == request.category_id else 0.0

    score = (
        category * 0.18
        + semantic * 0.30
        + price * 0.22
        + location * 0.12
        + attrs * 0.13
        + condition * 0.05
    )
    return max(0, min(100, round(score * 100)))
