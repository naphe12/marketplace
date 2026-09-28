# Providers paiement et SMS

Le backend supporte des providers HTTP génériques configurés par variables d'environnement dans `backend/.env`.

Paiement : renseigner `PAYMENT_PROVIDER_BASE_URL`, `PAYMENT_PROVIDER_API_KEY` et optionnellement `PAYMENT_PROVIDER_WEBHOOK_SECRET`. Le checkout crée un paiement via `POST {PAYMENT_PROVIDER_BASE_URL}/payments`; le provider confirme via `POST {PUBLIC_API_URL}/api/v1/billing/webhooks/provider`. En local, `SIMULATED_PAYMENTS_ENABLED=true` permet de garder le bouton de confirmation test.

SMS : renseigner `SMS_PROVIDER_BASE_URL` et `SMS_PROVIDER_API_KEY`. Le service envoie les codes de vérification téléphone et de réinitialisation de mot de passe via `POST {SMS_PROVIDER_BASE_URL}/messages`.


## Providers par pays

Pour ouvrir plusieurs pays, gardez les variables globales comme fallback et ajoutez des surcharges JSON par pays actif admin :

```env
PAYMENT_PROVIDER_BY_COUNTRY={"BI":{"provider":"LUMICASH","base_url":"https://pay-bi.example.com","api_key":"KEY","webhook_secret":"SECRET"},"RW":{"provider":"MTN_MOMO","base_url":"https://pay-rw.example.com","api_key":"KEY"}}
SMS_PROVIDER_BY_COUNTRY={"BI":{"base_url":"https://sms-bi.example.com","api_key":"KEY","sender":"Markatos"},"RW":{"base_url":"https://sms-rw.example.com","api_key":"KEY","sender":"MarketRW"}}
```

Le paiement utilise le pays de l'annonce liée à la commande, sinon le pays du compte utilisateur. Les SMS utilisent le pays du compte utilisateur.
