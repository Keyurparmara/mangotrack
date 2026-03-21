from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta
from database import get_db
import models
import schemas
from auth_utils import require_manager

router = APIRouter(prefix="/payments", tags=["Payments"])


def _compute_status(paid: float, total: float) -> models.PaymentStatus:
    if paid <= 0:
        return models.PaymentStatus.pending
    elif paid >= total:
        return models.PaymentStatus.paid
    else:
        return models.PaymentStatus.partial


def _create_reminder(db: Session, payment: models.Payment):
    reminder_date = payment.due_date - timedelta(days=1)
    reminder = models.Reminder(
        payment_id=payment.id,
        reminder_date=reminder_date,
        is_done=False
    )
    db.add(reminder)


@router.post("/", response_model=schemas.PaymentOut, status_code=201)
def create_payment(
    payload: schemas.PaymentCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    sale = db.query(models.Sale).filter(models.Sale.id == payload.sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    existing = db.query(models.Payment).filter(models.Payment.sale_id == payload.sale_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Payment record already exists for this sale")

    paid = min(payload.paid_amount, sale.total_amount)
    remaining = sale.total_amount - paid

    payment = models.Payment(
        sale_id=payload.sale_id,
        total_amount=sale.total_amount,
        paid_amount=paid,
        remaining_amount=remaining,
        due_date=payload.due_date,
        status=_compute_status(paid, sale.total_amount)
    )
    db.add(payment)
    db.flush()

    _create_reminder(db, payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.put("/{payment_id}", response_model=schemas.PaymentOut)
def update_payment(
    payment_id: int,
    payload: schemas.PaymentUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payload.paid_amount > payment.total_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Paid amount cannot exceed total amount {payment.total_amount}"
        )

    payment.paid_amount = payload.paid_amount
    payment.remaining_amount = payment.total_amount - payload.paid_amount
    payment.status = _compute_status(payload.paid_amount, payment.total_amount)

    if payload.due_date:
        payment.due_date = payload.due_date
        # Delete existing reminders and create new one
        db.query(models.Reminder).filter(
            models.Reminder.payment_id == payment_id,
            models.Reminder.is_done == False
        ).delete()
        _create_reminder(db, payment)

    db.commit()
    db.refresh(payment)
    return payment


@router.get("/", response_model=List[schemas.PaymentOut])
def list_payments(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    return db.query(models.Payment).order_by(models.Payment.created_at.desc()).all()


@router.get("/{payment_id}", response_model=schemas.PaymentOut)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment
