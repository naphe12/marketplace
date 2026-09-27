"""Run periodically with: python -m app.jobs.meetup_reminders."""
import argparse
import asyncio
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal, engine
from app.models.conversation import Conversation, Message
from app.services.notification_service import NotificationService


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _json(content: str) -> dict:
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


async def process_meetup_reminders(
    db: AsyncSession,
    *,
    reminder_minutes: int = 60,
    window_minutes: int = 15,
) -> int:
    now = datetime.now(timezone.utc)
    window_start = now + timedelta(minutes=reminder_minutes)
    window_end = window_start + timedelta(minutes=window_minutes)

    result = await db.execute(
        select(Message)
        .where(Message.message_type.in_(["MEETUP", "MEETUP_RESPONSE", "MEETUP_UPDATE", "MEETUP_CANCELLED"]))
        .order_by(Message.created_at.asc())
    )

    messages = list(result.scalars().all())
    meetups: dict[str, dict] = {}

    for message in messages:
        payload = _json(message.content)

        if message.message_type == "MEETUP":
            scheduled_at = _parse_datetime(payload.get("scheduled_at"))
            if not scheduled_at:
                continue
            meetups[str(message.id)] = {
                "message": message,
                "scheduled_at": scheduled_at,
                "location_label": payload.get("location_label") or "Lieu à confirmer",
                "status": "PENDING",
            }
            continue

        meetup_id = payload.get("meetup_message_id")
        if not meetup_id or meetup_id not in meetups:
            continue

        if message.message_type == "MEETUP_CANCELLED":
            meetups[meetup_id]["status"] = "CANCELLED"
        elif message.message_type == "MEETUP_UPDATE":
            scheduled_at = _parse_datetime(payload.get("scheduled_at"))
            if scheduled_at:
                meetups[meetup_id]["scheduled_at"] = scheduled_at
            if payload.get("location_label"):
                meetups[meetup_id]["location_label"] = payload["location_label"]
            meetups[meetup_id]["status"] = "UPDATED"
        elif message.message_type == "MEETUP_RESPONSE":
            meetups[meetup_id]["status"] = payload.get("decision") or meetups[meetup_id]["status"]

    created_count = 0

    for meetup_id, meetup in meetups.items():
        if meetup["status"] in {"CANCELLED", "REJECTED"}:
            continue
        if not (window_start <= meetup["scheduled_at"] < window_end):
            continue

        conversation = await db.get(
            Conversation,
            meetup["message"].conversation_id,
            options=[selectinload(Conversation.participants)],
        )
        if not conversation:
            continue

        for participant in conversation.participants:
            await NotificationService.create(
                db,
                user_id=participant.user_id,
                notification_type="MEETUP_REMINDER",
                title="Rappel de rendez-vous",
                message=(
                    f"Votre rendez-vous à {meetup['location_label']} approche."
                ),
                data={
                    "conversation_id": str(conversation.id),
                    "meetup_message_id": meetup_id,
                    "scheduled_at": meetup["scheduled_at"].isoformat(),
                },
                deduplication_key=f"MEETUP_REMINDER:{meetup_id}:{participant.user_id}:{reminder_minutes}",
                commit=False,
            )
            created_count += 1

    await db.commit()
    return created_count


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create meetup reminder notifications.")
    parser.add_argument("--reminder-minutes", type=int, default=60)
    parser.add_argument("--window-minutes", type=int, default=15)
    return parser.parse_args()


async def main():
    args = parse_args()
    try:
        async with AsyncSessionLocal() as db:
            count = await process_meetup_reminders(
                db,
                reminder_minutes=args.reminder_minutes,
                window_minutes=args.window_minutes,
            )
            print(f"{count} notification(s) de rappel rendez-vous creee(s).")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
