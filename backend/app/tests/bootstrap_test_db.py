import asyncio
import os

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    create_async_engine,
)

# Important :
# importer l'application charge les modèles
# réellement utilisés par FastAPI.
from app.main import app as _app  # noqa: F401

from app.models.base import Base


def get_test_database_url() -> str:
    url = os.environ.get(
        "TEST_DATABASE_URL"
    )

    if not url:
        raise RuntimeError(
            "TEST_DATABASE_URL n'est pas définie."
        )

    if url.startswith(
        "postgresql://"
    ):
        url = url.replace(
            "postgresql://",
            "postgresql+asyncpg://",
            1,
        )

    return url


async def main() -> None:
    url = get_test_database_url()

    print(
        "Tables SQLAlchemy détectées:",
        len(Base.metadata.tables),
    )

    print()

    for table_name in sorted(
        Base.metadata.tables.keys()
    ):
        print(
            " -",
            table_name,
        )

    engine = create_async_engine(
        url,
        echo=False,
    )

    async with engine.begin() as conn:

        print()
        print(
            "Suppression du schéma market..."
        )

        await conn.execute(
            text(
                "DROP SCHEMA IF EXISTS market CASCADE"
            )
        )

        print(
            "Création du schéma market..."
        )

        await conn.execute(
            text(
                "CREATE SCHEMA market"
            )
        )

        print(
            "Création des tables..."
        )

        await conn.run_sync(
            Base.metadata.create_all
        )

    await engine.dispose()

    print()
    print(
        "Base PostgreSQL de test initialisée."
    )


if __name__ == "__main__":
    asyncio.run(main())