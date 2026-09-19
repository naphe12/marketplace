-- Données fictives pour tester l'accueil et la recherche.
-- Identifiants stables : une nouvelle exécution ne duplique pas les données.
BEGIN;

INSERT INTO market.users
(id, phone, email, password_hash, account_type, status, phone_verified, email_verified)
VALUES
('de000000-0000-4000-8000-000000000001', 'DEMO-SELLER-001',
 'seller-demo@example.invalid', '!disabled-demo-account', 'INDIVIDUAL', 'ACTIVE', false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO market.user_profiles (id, user_id, display_name, bio, preferred_language)
VALUES ('de000000-0000-4000-8000-000000000002',
 'de000000-0000-4000-8000-000000000001', 'Vendeur Démo',
 'Profil fictif réservé aux tests. Aucune vente réelle.', 'fr')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO market.categories (id, name, slug, description, active, sort_order)
VALUES
('de000000-0000-4000-8000-000000000011', 'Téléphones', 'demo-telephones', 'Catégorie de démonstration', true, 101),
('de000000-0000-4000-8000-000000000012', 'Véhicules', 'demo-vehicules', 'Catégorie de démonstration', true, 102),
('de000000-0000-4000-8000-000000000013', 'Immobilier', 'demo-immobilier', 'Catégorie de démonstration', true, 103),
('de000000-0000-4000-8000-000000000014', 'Informatique', 'demo-informatique', 'Catégorie de démonstration', true, 104)
ON CONFLICT (id) DO NOTHING;

INSERT INTO market.listings
(id, seller_id, category_id, title, description, price, currency, price_type,
 condition, quantity, status, allow_offers, published_at, expires_at)
SELECT
 ('de000000-0000-4000-8000-' || lpad((100+n)::text, 12, '0'))::uuid,
 'de000000-0000-4000-8000-000000000001'::uuid,
 ('de000000-0000-4000-8000-' || lpad(cat::text, 12, '0'))::uuid,
 '[DÉMO] ' || title,
 'Annonce fictive pour tester le site. Cet article n''est pas réellement en vente.',
 price, 'BIF', 'FIXED', 'USED', 1, 'ACTIVE', true,
 now() - n * interval '1 hour', now() + interval '30 days'
FROM (VALUES
 (1,11,'Samsung Galaxy A54',650000),
 (2,11,'iPhone 12 — 128 Go',950000),
 (3,11,'Téléphone Tecno Spark',280000),
 (4,12,'Toyota Corolla',18500000),
 (5,12,'Moto de ville',3200000),
 (6,12,'Vélo tout terrain',450000),
 (7,13,'Appartement 2 chambres',800000),
 (8,13,'Maison avec jardin',1500000),
 (9,13,'Bureau à louer',500000),
 (10,14,'Ordinateur portable Lenovo',1200000),
 (11,14,'Écran 24 pouces',380000),
 (12,14,'Clavier et souris',95000)
) AS demo(n,cat,title,price)
ON CONFLICT (id) DO NOTHING;

COMMIT;
