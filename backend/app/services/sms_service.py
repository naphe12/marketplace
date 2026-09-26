import json
from urllib import request

from fastapi import HTTPException

from app.core.config import settings


class SmsService:
    @staticmethod
    async def send_password_reset(phone: str, code: str) -> None:
        message = (
            f"{settings.SMS_SENDER_NAME}: votre code de réinitialisation est "
            f"{code}. Il expire dans {settings.PASSWORD_RESET_TOKEN_MINUTES} minutes."
        )
        await SmsService.send_sms(phone, message)

    @staticmethod
    async def send_sms(phone: str, message: str) -> None:
        if not settings.SMS_PROVIDER_BASE_URL or not settings.SMS_PROVIDER_API_KEY:
            raise HTTPException(
                status_code=503,
                detail="Provider SMS non configuré.",
            )

        body = json.dumps(
            {
                "to": phone,
                "sender": settings.SMS_SENDER_NAME,
                "message": message,
            }
        ).encode("utf-8")

        req = request.Request(
            f"{settings.SMS_PROVIDER_BASE_URL.rstrip('/')}/messages",
            data=body,
            headers={
                "Authorization": f"Bearer {settings.SMS_PROVIDER_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=15):
                return
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail="Le provider SMS ne répond pas.",
            ) from exc
