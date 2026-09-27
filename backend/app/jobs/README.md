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


# Alertes de recherches sauvegardées

Depuis `backend`, avec l'environnement Python du projet activé :

```sh
python -m app.jobs.saved_search_alerts --lookback-minutes 60
```

Planifier cette commande avec le planificateur du serveur, par exemple toutes
les 15 à 60 minutes selon le volume. La tâche parcourt les recherches
sauvegardées avec `alerts_enabled = true`, cherche les annonces ACTIVE publiées
dans la fenêtre demandée, puis crée une notification `SAVED_SEARCH_MATCH`.

La clé de déduplication inclut la recherche sauvegardée et l'annonce, donc une
même annonce ne renvoie pas plusieurs alertes pour la même recherche même si deux
exécutions se chevauchent. `--since 2026-09-27T08:00:00Z` permet de rejouer une
fenêtre précise ; sans `--since`, `--lookback-minutes` est utilisé.


## Rappels de rendez-vous

```bash
python -m app.jobs.meetup_reminders --reminder-minutes 60 --window-minutes 15
```

A planifier toutes les 5 a 15 minutes pour notifier les deux participants avant un rendez-vous accepte ou en attente. Les notifications sont dedupliquees par rendez-vous, participant et delai de rappel.
