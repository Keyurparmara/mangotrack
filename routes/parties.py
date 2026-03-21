from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List
from database import get_db
import models
import schemas
from auth_utils import require_manager

router = APIRouter(prefix="/parties", tags=["Parties"])


@router.get("/", response_model=List[schemas.PartySummary])
def list_parties(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    """Aggregate purchases by company (party/supplier)."""
    purchases = (
        db.query(models.Purchase)
        .options(joinedload(models.Purchase.items), joinedload(models.Purchase.payment))
        .all()
    )

    party_map = {}
    for p in purchases:
        key = p.company_name.strip().lower()
        if key not in party_map:
            party_map[key] = {
                "company_name": p.company_name,
                "city_name": p.city_name,
                "total_purchases": 0,
                "total_items_bought": 0,
                "total_amount_owed": 0.0,
                "total_paid": 0.0,
                "total_remaining": 0.0,
            }
        entry = party_map[key]
        entry["total_purchases"] += 1
        entry["total_items_bought"] += sum(i.quantity for i in p.items)

        if p.payment:
            entry["total_amount_owed"] += p.payment.total_amount
            entry["total_paid"] += p.payment.paid_amount
            entry["total_remaining"] += p.payment.remaining_amount

    return list(party_map.values())


@router.get("/{company_name}")
def get_party_detail(
    company_name: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    """All purchases from a specific company with payment details."""
    purchases = (
        db.query(models.Purchase)
        .options(
            joinedload(models.Purchase.items).joinedload(models.PurchaseItem.mango_category),
            joinedload(models.Purchase.items).joinedload(models.PurchaseItem.box_type),
            joinedload(models.Purchase.payment).joinedload(models.PurchasePayment.transactions),
        )
        .filter(func.lower(models.Purchase.company_name) == company_name.lower())
        .order_by(models.Purchase.purchase_datetime.desc())
        .all()
    )

    result = []
    total_paid = 0.0
    total_owed = 0.0

    for p in purchases:
        items_data = []
        for item in p.items:
            items_data.append({
                "id": item.id,
                "item_type": item.item_type,
                "mango_category_name": item.mango_category.name if item.mango_category else None,
                "size": item.size,
                "box_brand": item.box_type.brand_name if item.box_type else None,
                "quantity": item.quantity,
                "price_per_unit": item.price_per_unit,
                "subtotal": item.quantity * item.price_per_unit,
            })

        payment_data = None
        if p.payment:
            total_owed += p.payment.total_amount
            total_paid += p.payment.paid_amount
            payment_data = {
                "id": p.payment.id,
                "total_amount": p.payment.total_amount,
                "paid_amount": p.payment.paid_amount,
                "remaining_amount": p.payment.remaining_amount,
                "status": p.payment.status,
                "transactions": [
                    {
                        "id": t.id,
                        "amount": t.amount,
                        "notes": t.notes,
                        "paid_at": t.paid_at,
                    }
                    for t in p.payment.transactions
                ]
            }

        result.append({
            "id": p.id,
            "city_name": p.city_name,
            "company_name": p.company_name,
            "vehicle_number": p.vehicle_number,
            "unload_employee": p.unload_employee,
            "purchase_datetime": p.purchase_datetime,
            "items": items_data,
            "payment": payment_data,
        })

    return {
        "company_name": purchases[0].company_name if purchases else company_name,
        "city_name": purchases[0].city_name if purchases else "",
        "total_purchases": len(purchases),
        "total_paid": total_paid,
        "total_remaining": total_owed - total_paid,
        "total_owed": total_owed,
        "purchases": result,
    }
