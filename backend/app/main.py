from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.router import api_router
from app.core.config import settings


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://accomplished-trust-staging.up.railway.app",
        "https://humble-youth-staging.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    api_router,
    prefix="/api/v1",
)


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "status": "running",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
    }