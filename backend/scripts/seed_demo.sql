-- Données fictives pour tester l'accueil et la recherche.
-- Identifiants stables : une nouvelle exécution ne duplique pas les données.
BEGIN;

-- Remplacer cette valeur par le téléphone EXACT ou l'UUID d'un compte existant.
-- Le mot de passe et le profil de ce compte ne sont jamais modifiés.
CREATE TEMP TABLE demo_seed_owner (user_id uuid NOT NULL) ON COMMIT DROP;

DO $$
DECLARE
    account_identifier text := '690a7b69-9789-43b6-9b07-9ecbe6b11103';
    owner_id uuid;
BEGIN
    SELECT id INTO STRICT owner_id
    FROM market.users
    WHERE (phone = account_identifier OR id::text = account_identifier)
      AND status = 'ACTIVE' AND deleted_at IS NULL
      AND password_hash <> '!disabled-demo-account';

    INSERT INTO demo_seed_owner VALUES (owner_id);

    -- Autorise la reprise du premier seed, sans prendre les annonces d'un autre compte.
    IF EXISTS (
        SELECT 1 FROM market.listings
        WHERE id IN (
            SELECT ('de000000-0000-4000-8000-' || lpad((100+n)::text,12,'0'))::uuid
            FROM generate_series(1,12) AS n
        )
        AND seller_id NOT IN (owner_id, 'de000000-0000-4000-8000-000000000001'::uuid)
    ) THEN
        RAISE EXCEPTION 'Des annonces de démonstration appartiennent déjà à un autre compte.';
    END IF;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE EXCEPTION 'Compte actif introuvable : renseignez son téléphone ou son UUID dans account_identifier.';
    WHEN TOO_MANY_ROWS THEN
        RAISE EXCEPTION 'Identifiant ambigu : utilisez l UUID du compte.';
END $$;

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
 (SELECT user_id FROM demo_seed_owner),
 ('de000000-0000-4000-8000-' || lpad(cat::text, 12, '0'))::uuid,
 '[DÉMO] ' || title,
 'Annonce fictive de démonstration, sans vente réelle.' || E'\n\n' || details,
 price, 'BIF', 'FIXED', 'USED', 1, 'ACTIVE', true,
 now() - n * interval '1 hour', now() + interval '30 days'
FROM (VALUES
 (1,11,'Samsung Galaxy A54',650000,'Couleur noire, stockage 128 Go, double SIM. Écran en bon état, quelques traces sur la coque. Chargeur inclus. Remise en main propre à Bujumbura après essai.'),
 (2,11,'iPhone 12 — 128 Go',950000,'Coloris bleu, capacité 128 Go. Batterie annoncée à 86 % pour ce scénario de test. Appareil désimlocké, câble fourni. Vérification des fonctions lors du rendez-vous.'),
 (3,11,'Téléphone Tecno Spark',280000,'Stockage 64 Go, double SIM, coque de protection et chargeur inclus. Convient aux appels et aux applications courantes. Retrait sur rendez-vous à Bujumbura.'),
 (4,12,'Toyota Corolla',18500000,'Année 2012, boîte automatique, essence, 145 000 km fictifs. Climatisation et intérieur tissu. Visite et essai sur rendez-vous ; documents à vérifier avant toute transaction réelle.'),
 (5,12,'Moto de ville',3200000,'Moto 125 cm³, année 2021, 18 000 km fictifs. Entretien régulier, casque inclus. Quelques rayures sur le réservoir. Visible à Gitega sur rendez-vous.'),
 (6,12,'Vélo tout terrain',450000,'VTT adulte, roues 26 pouces, 21 vitesses. Freins et pneus en bon état. Selle réglable ; idéal pour les déplacements de proximité. Essai possible avant remise.'),
 (7,13,'Appartement 2 chambres',800000,'Location mensuelle fictive à Bujumbura : deux chambres, salon, cuisine et salle de bains. Surface indicative de 75 m². Eau et électricité hors loyer ; visite sur rendez-vous.'),
 (8,13,'Maison avec jardin',1500000,'Maison à louer : trois chambres, deux salles de bains, terrasse et jardin clos. Surface indicative de 140 m². Prix affiché par mois, charges non comprises. Stationnement disponible.'),
 (9,13,'Bureau à louer',500000,'Bureau de 30 m² en location mensuelle, lumineux, accès partagé aux sanitaires. Adapté à une petite équipe. Internet et charges à discuter. Visite sur rendez-vous.'),
 (10,14,'Ordinateur portable Lenovo',1200000,'Lenovo ThinkPad, processeur Intel Core i5, RAM 8 Go et SSD 256 Go. Écran 14 pouces, clavier AZERTY. Chargeur inclus, autonomie indicative de 4 heures. Essai possible.'),
 (11,14,'Écran 24 pouces',380000,'Écran 24 pouces Full HD, résolution 1920 × 1080, connexion HDMI. Pied et câble alimentation inclus. Aucun pixel défectueux déclaré dans cet exemple de test.'),
 (12,14,'Clavier et souris',95000,'Ensemble clavier AZERTY et souris USB filaires. Bon état, touches testées. Compatible avec les ordinateurs disposant de ports USB. Vente du lot uniquement.')
) AS demo(n,cat,title,price,details)
ON CONFLICT (id) DO UPDATE SET
 seller_id = EXCLUDED.seller_id,
 description = CASE
   WHEN market.listings.seller_id = 'de000000-0000-4000-8000-000000000001'::uuid
   THEN EXCLUDED.description
   ELSE market.listings.description
 END,
 updated_at = now();

-- Les autres champs existants sont conservés, y compris les modifications du vendeur.
SELECT count(*) AS annonces_demo_du_compte
FROM market.listings
WHERE seller_id = (SELECT user_id FROM demo_seed_owner)
AND id IN (
 SELECT ('de000000-0000-4000-8000-' || lpad((100+n)::text,12,'0'))::uuid
 FROM generate_series(1,12) AS n
);

COMMIT;
