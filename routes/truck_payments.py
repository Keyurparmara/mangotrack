from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database import get_db
import models
import schemas
from auth_utils import require_manager

router = APIRouter(prefix="/truck-payments", tags=["Truck Payments"])


def _compute_status(paid: float, total: float) -> models.PaymentStatus:
    if paid <= 0:
        return models.PaymentStatus.pending
    elif paid >= total:
        return models.PaymentStatus.paid
    else:
        return models.PaymentStatus.partial


@router.post("/", response_model=schemas.TruckPaymentOut, status_code=201)
def create_truck_payment(
    payload: schemas.TruckPaymentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager)
):
    paid = min(payload.paid_amount, payload.total_freight)
    remaining = payload.total_freight - paid

    tp = models.TruckPayment(
        vehicle_number=payload.vehicle_number,
        driver_name=payload.driver_name,
        destination=payload.destination,
        boxes_count=payload.boxes_count,
        total_freight=payload.total_freight,
        paid_amount=paid,
        remaining_amount=remaining,
        departure_time=payload.departure_time,
        arrival_time=payload.arrival_time,
        status=_compute_status(paid, payload.total_freight),
        notes=payload.notes,
        created_by=current_user.id
    )
    db.add(tp)
    db.flush()

    if paid > 0:
        txn = models.TruckPaymentTransaction(
            truck_payment_id=tp.id,
            amount=paid,
            notes="Initial payment",
            paid_at=datetime.utcnow()
        )
        db.add(txn)

    db.commit()
    db.refresh(tp)
    return tp


@router.post("/{tp_id}/transactions", response_model=schemas.TruckPaymentOut)
def add_transaction(
    tp_id: int,
    payload: schemas.TruckPaymentTransactionCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    tp = db.query(models.TruckPayment).filter(models.TruckPayment.id == tp_id).first()
    if not tp:
        raise HTTPException(status_code=404, detail="Truck payment not found")

    new_paid = tp.paid_amount + payload.amount
    if new_paid > tp.total_freight:
        raise HTTPException(
            status_code=400,
            detail=f"Payment exceeds total freight. Remaining: {tp.remaining_amount:.2f}"
        )

    txn = models.TruckPaymentTransaction(
        truck_payment_id=tp_id,
        amount=payload.amount,
        notes=payload.notes,
        paid_at=payload.paid_at
    )
    db.add(txn)

    tp.paid_amount = new_paid
    tp.remaining_amount = tp.total_freight - new_paid
    tp.status = _compute_status(new_paid, tp.total_freight)

    db.commit()
    db.refresh(tp)
    return tp


@router.get("/", response_model=List[schemas.TruckPaymentOut])
def list_truck_payments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager)
):
    q = db.query(models.TruckPayment).order_by(models.TruckPayment.created_at.desc())
    if current_user.role == models.UserRole.manager:
        q = q.filter(models.TruckPayment.created_by == current_user.id)
    return q.all()


@router.get("/{tp_id}", response_model=schemas.TruckPaymentOut)
def get_truck_payment(
    tp_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    tp = db.query(models.TruckPayment).filter(models.TruckPayment.id == tp_id).first()
    if not tp:
        raise HTTPException(status_code=404, detail="Truck payment not found")
    return tp
