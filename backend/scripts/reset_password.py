"""Depuis backend : python -m scripts.reset_password UUID_UTILISATEUR."""
import argparse
import asyncio
from getpass import getpass
from uuid import UUID

from sqlalchemy import update

from app.core.database import AsyncSessionLocal, engine
from app.core.security import hash_password
from app.models.user import User


async def reset_password(user_id: UUID, password: str):
    try:
        async with AsyncSessionLocal() as db:
            async with db.begin():
                result = await db.execute(
                    update(User)
                    .where(User.id == user_id, User.deleted_at.is_(None))
                    .values(password_hash=hash_password(password))
                    .returning(User.id)
                )
                if result.scalar_one_or_none() is None:
                    raise ValueError("Compte introuvable ou supprimé ; aucune modification.")
        print("Mot de passe réinitialisé. Connectez-vous avec le téléphone du compte.")
    finally:
        await engine.dispose()


def main():
    parser = argparse.ArgumentParser(description="Réinitialiser le mot de passe d'un compte existant.")
    parser.add_argument("user_id", type=UUID)
    args = parser.parse_args()
    password = getpass("Nouveau mot de passe (8 à 128 caractères) : ")
    if not 8 <= len(password) <= 128:
        parser.error("Le mot de passe doit contenir entre 8 et 128 caractères.")
    if password != getpass("Confirmer le nouveau mot de passe : "):
        parser.error("Les mots de passe ne correspondent pas.")
    asyncio.run(reset_password(args.user_id, password))


if __name__ == "__main__":
    main()
