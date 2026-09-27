import hashlib
import hmac
import json
from decimal import Decimal
from urllib import request

from fastapi import HTTPException

from app.core.config import settings


class ProviderConfigError(ValueError):
    pass


def _load_country_config(raw: str | None, country_code: str | None) -> dict:
    if not raw or not country_code:
        return {}

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ProviderConfigError("Configuration provider pays invalide.") from exc

    country_data = data.get(country_code.upper(), {})
    if not isinstance(country_data, dict):
        raise ProviderConfigError("Configuration provider pays invalide.")
    return country_data


class PaymentProvider:
    @staticmethod
    def get_config(country_code: str | None = None) -> dict:
        country_config = _load_country_config(
            settings.PAYMENT_PROVIDER_BY_COUNTRY,
            country_code,
        )
        return {
            "base_url": country_config.get("base_url") or settings.PAYMENT_PROVIDER_BASE_URL,
            "api_key": country_config.get("api_key") or settings.PAYMENT_PROVIDER_API_KEY,
            "webhook_secret": country_config.get("webhook_secret") or settings.PAYMENT_PROVIDER_WEBHOOK_SECRET,
            "provider": country_config.get("provider"),
        }

    @staticmethod
    async def initialize_payment(
        *,
        payment_id: str,
        amount: Decimal,
        currency: str,
        phone: str,
        callback_url: str,
        country_code: str | None = None,
    ) -> dict:
        config = PaymentProvider.get_config(country_code)
        if not config["base_url"] or not config["api_key"]:
            raise HTTPException(
                status_code=503,
                detail="Provider de paiement non configuré.",
            )

        payload = {
            "reference": payment_id,
            "amount": str(amount),
            "currency": currency,
            "customer_phone": phone,
            "callback_url": callback_url,
            "country_code": country_code,
        }

        body = json.dumps(payload).encode("utf-8")
        req = request.Request(
            f"{config['base_url'].rstrip('/')}/payments",
            data=body,
            headers={
                "Authorization": f"Bearer {config['api_key']}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=15) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail="Le provider de paiement ne répond pas.",
            ) from exc

    @staticmethod
    def verify_webhook_signature(
        raw_body: bytes,
        signature: str | None,
        country_code: str | None = None,
    ) -> bool:
        secret = PaymentProvider.get_config(country_code)["webhook_secret"]
        if not secret:
            return True

        if not signature:
            return False

        expected = hmac.new(
            secret.encode("utf-8"),
            raw_body,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected, signature)
