from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database import get_db
import models
import schemas
from auth_utils import require_manager

router = APIRouter(prefix="/purchase-payments", tags=["Purchase Payments"])


def _compute_status(paid: float, total: float) -> models.PaymentStatus:
    if paid <= 0:
        return models.PaymentStatus.pending
    elif paid >= total:
        return models.PaymentStatus.paid
    else:
        return models.PaymentStatus.partial


@router.post("/", response_model=schemas.PurchasePaymentOut, status_code=201)
def create_purchase_payment(
    payload: schemas.PurchasePaymentCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    purchase = db.query(models.Purchase).filter(models.Purchase.id == payload.purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    existing = db.query(models.PurchasePayment).filter(
        models.PurchasePayment.purchase_id == payload.purchase_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Payment record already exists for this purchase")

    paid = min(payload.paid_amount, payload.total_amount)
    remaining = payload.total_amount - paid

    pp = models.PurchasePayment(
        purchase_id=payload.purchase_id,
        total_amount=payload.total_amount,
        paid_amount=paid,
        remaining_amount=remaining,
        status=_compute_status(paid, payload.total_amount),
        notes=payload.notes
    )
    db.add(pp)
    db.flush()

    # If initial paid amount > 0, create a transaction record
    if paid > 0:
        txn = models.PurchasePaymentTransaction(
            purchase_payment_id=pp.id,
            amount=paid,
            notes="Initial payment",
            paid_at=datetime.utcnow()
        )
        db.add(txn)

    db.commit()
    db.refresh(pp)
    return pp


@router.post("/{pp_id}/transactions", response_model=schemas.PurchasePaymentOut)
def add_transaction(
    pp_id: int,
    payload: schemas.PurchasePaymentTransactionCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    pp = db.query(models.PurchasePayment).filter(models.PurchasePayment.id == pp_id).first()
    if not pp:
        raise HTTPException(status_code=404, detail="Purchase payment not found")

    new_paid = pp.paid_amount + payload.amount
    if new_paid > pp.total_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Payment exceeds total. Remaining: {pp.remaining_amount:.2f}"
        )

    txn = models.PurchasePaymentTransaction(
        purchase_payment_id=pp_id,
        amount=payload.amount,
        notes=payload.notes,
        paid_at=payload.paid_at
    )
    db.add(txn)

    pp.paid_amount = new_paid
    pp.remaining_amount = pp.total_amount - new_paid
    pp.status = _compute_status(new_paid, pp.total_amount)

    db.commit()
    db.refresh(pp)
    return pp


@router.get("/", response_model=List[schemas.PurchasePaymentOut])
def list_purchase_payments(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    return db.query(models.PurchasePayment).order_by(
        models.PurchasePayment.created_at.desc()
    ).all()


@router.get("/{pp_id}", response_model=schemas.PurchasePaymentOut)
def get_purchase_payment(
    pp_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    pp = db.query(models.PurchasePayment).filter(models.PurchasePayment.id == pp_id).first()
    if not pp:
        raise HTTPException(status_code=404, detail="Purchase payment not found")
    return pp


@router.get("/by-purchase/{purchase_id}", response_model=schemas.PurchasePaymentOut)
def get_by_purchase(
    purchase_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    pp = db.query(models.PurchasePayment).filter(
        models.PurchasePayment.purchase_id == purchase_id
    ).first()
    if not pp:
        raise HTTPException(status_code=404, detail="No payment record for this purchase")
    return pp
