import json
from urllib import request

from fastapi import HTTPException

from app.core.config import settings


def _load_country_config(raw: str | None, country_code: str | None) -> dict:
    if not raw or not country_code:
        return {}

    data = json.loads(raw)
    country_data = data.get(country_code.upper(), {})
    return country_data if isinstance(country_data, dict) else {}


class SmsService:
    @staticmethod
    def get_config(country_code: str | None = None) -> dict:
        country_config = _load_country_config(
            settings.SMS_PROVIDER_BY_COUNTRY,
            country_code,
        )
        return {
            "base_url": country_config.get("base_url") or settings.SMS_PROVIDER_BASE_URL,
            "api_key": country_config.get("api_key") or settings.SMS_PROVIDER_API_KEY,
            "sender": country_config.get("sender") or settings.SMS_SENDER_NAME,
        }

    @staticmethod
    async def send_password_reset(
        phone: str,
        code: str,
        country_code: str | None = None,
    ) -> None:
        sender = SmsService.get_config(country_code)["sender"]
        message = (
            f"{sender}: votre code de réinitialisation est "
            f"{code}. Il expire dans {settings.PASSWORD_RESET_TOKEN_MINUTES} minutes."
        )
        await SmsService.send_sms(phone, message, country_code=country_code)

    @staticmethod
    async def send_sms(
        phone: str,
        message: str,
        country_code: str | None = None,
    ) -> None:
        config = SmsService.get_config(country_code)
        if not config["base_url"] or not config["api_key"]:
            raise HTTPException(
                status_code=503,
                detail="Provider SMS non configuré.",
            )

        body = json.dumps(
            {
                "to": phone,
                "sender": config["sender"],
                "message": message,
            }
        ).encode("utf-8")

        req = request.Request(
            f"{config['base_url'].rstrip('/')}/messages",
            data=body,
            headers={
                "Authorization": f"Bearer {config['api_key']}",
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
