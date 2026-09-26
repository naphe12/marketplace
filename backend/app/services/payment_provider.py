import hashlib
import hmac
import json
from decimal import Decimal
from urllib import request

from fastapi import HTTPException

from app.core.config import settings


class PaymentProvider:
    @staticmethod
    async def initialize_payment(
        *,
        payment_id: str,
        amount: Decimal,
        currency: str,
        phone: str,
        callback_url: str,
    ) -> dict:
        if not settings.PAYMENT_PROVIDER_BASE_URL or not settings.PAYMENT_PROVIDER_API_KEY:
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
        }

        body = json.dumps(payload).encode("utf-8")
        req = request.Request(
            f"{settings.PAYMENT_PROVIDER_BASE_URL.rstrip('/')}/payments",
            data=body,
            headers={
                "Authorization": f"Bearer {settings.PAYMENT_PROVIDER_API_KEY}",
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
    def verify_webhook_signature(raw_body: bytes, signature: str | None) -> bool:
        if not settings.PAYMENT_PROVIDER_WEBHOOK_SECRET:
            return True

        if not signature:
            return False

        expected = hmac.new(
            settings.PAYMENT_PROVIDER_WEBHOOK_SECRET.encode("utf-8"),
            raw_body,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected, signature)
