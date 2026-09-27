# Providers paiement et SMS

Le backend supporte des providers HTTP génériques configurés par variables d'environnement dans `backend/.env`.

Paiement : renseigner `PAYMENT_PROVIDER_BASE_URL`, `PAYMENT_PROVIDER_API_KEY` et optionnellement `PAYMENT_PROVIDER_WEBHOOK_SECRET`. Le checkout crée un paiement via `POST {PAYMENT_PROVIDER_BASE_URL}/payments`; le provider confirme via `POST {PUBLIC_API_URL}/api/v1/billing/webhooks/provider`. En local, `SIMULATED_PAYMENTS_ENABLED=true` permet de garder le bouton de confirmation test.

SMS : renseigner `SMS_PROVIDER_BASE_URL` et `SMS_PROVIDER_API_KEY`. Le service envoie les codes de vérification téléphone et de réinitialisation de mot de passe via `POST {SMS_PROVIDER_BASE_URL}/messages`.
