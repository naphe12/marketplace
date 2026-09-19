import asyncio

from sqlalchemy import text

from app.core.database import engine


async def test_database():
    async with engine.connect() as connection:
        result = await connection.execute(
            text("SELECT 1")
        )

        print("Database connection OK")
        print("Result:", result.scalar())


asyncio.run(test_database())