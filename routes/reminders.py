from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from database import get_db
import models
import schemas
from auth_utils import require_manager

router = APIRouter(prefix="/reminders", tags=["Reminders"])


def _scoped_reminder_query(db: Session, current_user: models.User):
    q = db.query(models.Reminder)
    if current_user.role == models.UserRole.manager:
        emp_ids = [e.id for e in db.query(models.User).filter(
            models.User.parent_id == current_user.id
        ).all()]
        all_ids = [current_user.id] + emp_ids
        q = (q
             .join(models.Payment, models.Reminder.payment_id == models.Payment.id)
             .join(models.Sale, models.Payment.sale_id == models.Sale.id)
             .filter(models.Sale.employee_id.in_(all_ids)))
    return q


@router.get("/", response_model=List[schemas.ReminderOut])
def get_upcoming_reminders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager)
):
    now = datetime.utcnow()
    upcoming_limit = now + timedelta(days=2)

    reminders = (
        _scoped_reminder_query(db, current_user)
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
    current_user: models.User = Depends(require_manager)
):
    return _scoped_reminder_query(db, current_user).order_by(models.Reminder.reminder_date.asc()).all()


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
