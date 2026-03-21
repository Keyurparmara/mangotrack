from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from database import get_db
import models
import schemas
from auth_utils import get_current_user, require_manager

router = APIRouter(prefix="/sales", tags=["Sales"])


def _get_mango_stock(db: Session, mango_category_id: int, size: models.MangoSize) -> int:
    purchased = db.query(func.coalesce(func.sum(models.PurchaseItem.quantity), 0)).filter(
        models.PurchaseItem.item_type == models.ItemType.mango,
        models.PurchaseItem.mango_category_id == mango_category_id,
        models.PurchaseItem.size == size
    ).scalar()

    sold = db.query(func.coalesce(func.sum(models.Sale.quantity), 0)).filter(
        models.Sale.mango_category_id == mango_category_id,
        models.Sale.size == size
    ).scalar()

    return int(purchased) - int(sold)


def _sale_to_dict(sale: models.Sale) -> dict:
    """Convert sale ORM object to dict with employee_username included."""
    return {
        "id": sale.id,
        "employee_id": sale.employee_id,
        "employee_username": sale.employee.username if sale.employee else None,
        "mango_category_id": sale.mango_category_id,
        "size": sale.size,
        "quantity": sale.quantity,
        "price_per_box": sale.price_per_box,
        "box_type_id": sale.box_type_id,
        "box_quantity": sale.box_quantity,
        "box_price_per_unit": sale.box_price_per_unit,
        "customer_name": sale.customer_name,
        "customer_village": sale.customer_village,
        "transport_type": sale.transport_type,
        "vehicle_number": sale.vehicle_number,
        "city": sale.city,
        "dispatch_time": sale.dispatch_time,
        "expected_delivery_time": sale.expected_delivery_time,
        "total_amount": sale.total_amount,
        "created_at": sale.created_at,
    }


@router.post("/", response_model=schemas.SaleOut, status_code=201)
def create_sale(
    payload: schemas.SaleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    has_mango = payload.mango_category_id and payload.quantity and payload.price_per_box
    has_box   = payload.box_type_id and payload.box_quantity and payload.box_price_per_unit
    if not has_mango and not has_box:
        raise HTTPException(status_code=400, detail="Mango ya box mein se kuch to becho!")

    if payload.dispatch_time >= payload.expected_delivery_time:
        raise HTTPException(status_code=400, detail="expected_delivery_time must be after dispatch_time")

    if has_mango:
        cat = db.query(models.MangoCategory).filter(models.MangoCategory.id == payload.mango_category_id).first()
        if not cat:
            raise HTTPException(status_code=404, detail="Mango category not found")
        available = _get_mango_stock(db, payload.mango_category_id, payload.size)
        if available < payload.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock. Available: {available} boxes, Requested: {payload.quantity} boxes")

    mango_total = (payload.quantity or 0) * (payload.price_per_box or 0)
    box_total   = (payload.box_quantity or 0) * (payload.box_price_per_unit or 0)
    total_amount = mango_total + box_total

    sale = models.Sale(
        employee_id=current_user.id,
        mango_category_id=payload.mango_category_id,
        size=payload.size,
        quantity=payload.quantity,
        price_per_box=payload.price_per_box,
        box_type_id=payload.box_type_id,
        box_quantity=payload.box_quantity,
        box_price_per_unit=payload.box_price_per_unit,
        customer_name=payload.customer_name,
        customer_village=payload.customer_village,
        transport_type=payload.transport_type,
        vehicle_number=payload.vehicle_number,
        city=payload.city,
        dispatch_time=payload.dispatch_time,
        expected_delivery_time=payload.expected_delivery_time,
        total_amount=total_amount
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)

    # Reload with employee relationship
    sale = db.query(models.Sale).options(joinedload(models.Sale.employee)).filter(models.Sale.id == sale.id).first()
    return _sale_to_dict(sale)


@router.get("/", response_model=List[schemas.SaleOut])
def list_sales(
    employee_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Sale).options(joinedload(models.Sale.employee))

    if current_user.role == models.UserRole.employee:
        query = query.filter(models.Sale.employee_id == current_user.id)
    elif employee_id:
        query = query.filter(models.Sale.employee_id == employee_id)

    sales = query.order_by(models.Sale.created_at.desc()).all()
    return [_sale_to_dict(s) for s in sales]


@router.get("/{sale_id}", response_model=schemas.SaleOut)
def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    sale = db.query(models.Sale).options(joinedload(models.Sale.employee)).filter(models.Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    if current_user.role == models.UserRole.employee and sale.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return _sale_to_dict(sale)
