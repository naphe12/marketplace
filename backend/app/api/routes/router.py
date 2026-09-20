from fastapi import APIRouter

from app.api.routes.admin import router as admin_router
from app.api.routes.admin_settings import router as admin_settings_router
from app.api.routes.auth import router as auth_router
from app.api.routes.billing import router as billing_router
from app.api.routes.categories import router as categories_router
from app.api.routes.conversations import router as conversations_router
from app.api.routes.favorites import router as favorites_router
from app.api.routes.images import router as images_router
from app.api.routes.listings import router as listings_router
from app.api.routes.locations import router as locations_router
from app.api.routes.moderation import router as moderation_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.offers import router as offers_router
from app.api.routes.publications import router as publications_router
from app.api.routes.reputation import router as reputation_router
from app.api.routes.reviews import router as reviews_router
from app.api.routes.transactions import router as transactions_router
from app.api.routes.verifications import router as verifications_router


api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(categories_router)
api_router.include_router(listings_router)
api_router.include_router(admin_settings_router)
api_router.include_router(admin_router)
api_router.include_router(publications_router)
api_router.include_router(billing_router)
api_router.include_router(conversations_router)
api_router.include_router(offers_router)
api_router.include_router(transactions_router)
api_router.include_router(reputation_router)
api_router.include_router(verifications_router)
api_router.include_router(moderation_router)
api_router.include_router(notifications_router)
api_router.include_router(favorites_router)
api_router.include_router(locations_router)
api_router.include_router(reviews_router)
api_router.include_router(images_router)
