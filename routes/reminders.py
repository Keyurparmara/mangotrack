from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from database import get_db
import models
import schemas
from auth_utils import require_manager

router = APIRouter(prefix="/reminders", tags=["Reminders"])


@router.get("/", response_model=List[schemas.ReminderOut])
def get_upcoming_reminders(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    now = datetime.utcnow()
    upcoming_limit = now + timedelta(days=2)

    reminders = (
        db.query(models.Reminder)
        .filter(
            models.Reminder.is_done == False,
            models.Reminder.reminder_date <= upcoming_limit
        )
        .order_by(models.Reminder.reminder_date.asc())
        .all()
    )
    return reminders


@router.get("/all", response_model=List[schemas.ReminderOut])
def get_all_reminders(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    return db.query(models.Reminder).order_by(models.Reminder.reminder_date.asc()).all()


@router.put("/{reminder_id}/done", response_model=schemas.ReminderOut)
def mark_reminder_done(
    reminder_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    reminder = db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    reminder.is_done = True
    db.commit()
    db.refresh(reminder)
    return reminder
