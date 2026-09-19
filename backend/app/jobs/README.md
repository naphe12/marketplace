# Notifications d'expiration

Depuis `backend`, avec l'environnement Python du projet activé :

```sh
alembic upgrade head
python -m app.jobs.listing_expiry
```

La migration suppose que le schéma `market` et la table `notifications` existent déjà.
Planifier la commande avec le planificateur du serveur, par exemple toutes les heures.
Aucune planification n'est installée automatiquement.

Les rappels J-3 et J-1 suivent les dates UTC. J0 est envoyé une fois l'heure
exacte d'expiration passée ; les expirations manquées sont rattrapées au prochain
passage. Seules les annonces ACTIVE non supprimées sont traitées ; les annonces
expirées passent à EXPIRED dans la même transaction que leur notification.
Les rappels J-3/J-1 manqués ne sont pas rattrapés après leur journée.

L'index unique empêche les doublons, y compris entre exécutions concurrentes.
La clé inclut le type de rappel, l'annonce et sa date d'expiration pour permettre
un nouveau cycle après renouvellement. Les lignes sont verrouillées pendant
le traitement pour coordonner les exécutions et les mises à jour concurrentes.
