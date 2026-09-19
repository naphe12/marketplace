# Photos dans un bucket privé Railway

Installer les dépendances puis appliquer la migration depuis backend :

```sh
pip install -r requirements.txt
alembic upgrade head
```

Variables du service backend (identifiants du bucket uniquement côté serveur) :

```env
PUBLIC_API_URL=https://votre-backend.up.railway.app
S3_ENDPOINT_URL=https://endpoint-fourni-par-railway
S3_ACCESS_KEY_ID=identifiant-du-bucket
S3_SECRET_ACCESS_KEY=secret-du-bucket
S3_BUCKET=nom-technique-du-bucket
S3_REGION=auto
```

PUBLIC_API_URL est l'origine du backend, sans /api/v1. Utiliser la région fournie
par le bucket si elle diffère de auto.

1. Déposer une photo dans le bucket, par exemple
   `listings/<UUID-annonce>/photo-1.webp`, avec Content-Type `image/webp`.
2. Avec le jeton du propriétaire, appeler
   `POST /api/v1/listings/<UUID-annonce>/images` :

```json
{
  "storage_key": "listings/<UUID-annonce>/photo-1.webp",
  "position": 0,
  "is_primary": true
}
```

Ne pas fournir image_url ou thumbnail_url dans ce cas. Le service génère
image_url et conserve storage_key. Le frontend utilise image_url sans changement.
Les anciennes images avec une URL HTTP externe restent acceptées.

GET /api/v1/images/<UUID-image> redirige vers une URL signée valable 5 minutes.
La redirection n'est pas mise en cache. Seules les annonces ACTIVE non supprimées
sont accessibles publiquement ; les images des brouillons ne sont pas exposées.

Le dépôt de fichiers via un formulaire frontend n'est pas inclus : ce parcours
associe un fichier déjà présent dans le bucket à son annonce. Les annonces de
seed_demo n'ont pas de vendeur connectable ; pour les tester avec des photos,
utiliser une annonce appartenant à un vrai compte de test, ou associer leurs
images directement en base avec storage_key et l'URL stable correspondante.

Vérification après déploiement : une image ACTIVE doit rediriger (307), un UUID
inconnu ou une annonce suspendue doit renvoyer 404. L'ajout d'une clé appartenant
au dossier d'une autre annonce doit renvoyer 400.
