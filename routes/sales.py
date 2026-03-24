from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import timedelta
from database import get_db
import models
import schemas
from auth_utils import get_current_user, require_manager

router = APIRouter(prefix="/sales", tags=["Sales"])


def _get_manager_id_for_user(user: models.User, db: Session):
    """Return the manager_id scope for stock checks. None = global (owner)."""
    if user.role == models.UserRole.owner:
        return None
    if user.role == models.UserRole.manager:
        return user.id
    # employee — use their parent manager
    return user.parent_id  # may be None if employee has no manager


def _get_mango_stock(db: Session, mango_category_id: int, size: models.MangoSize,
                     manager_id=None) -> int:
    pq = db.query(func.coalesce(func.sum(models.PurchaseItem.quantity), 0)).filter(
        models.PurchaseItem.item_type == models.ItemType.mango,
        models.PurchaseItem.mango_category_id == mango_category_id,
        models.PurchaseItem.size == size
    )
    if manager_id is not None:
        pq = pq.join(models.Purchase, models.PurchaseItem.purchase_id == models.Purchase.id).filter(
            models.Purchase.created_by == manager_id
        )
    purchased = pq.scalar()

    sq = db.query(func.coalesce(func.sum(models.Sale.quantity), 0)).filter(
        models.Sale.mango_category_id == mango_category_id,
        models.Sale.size == size
    )
    if manager_id is not None:
        emp_ids = [e.id for e in db.query(models.User).filter(
            models.User.parent_id == manager_id
        ).all()]
        sq = sq.filter(models.Sale.employee_id.in_([manager_id] + emp_ids))
    sold = sq.scalar()

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
        "customer_phone": sale.customer_phone,
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
        manager_id = _get_manager_id_for_user(current_user, db)
        available = _get_mango_stock(db, payload.mango_category_id, payload.size, manager_id)
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
        customer_phone=payload.customer_phone,
        transport_type=payload.transport_type,
        vehicle_number=payload.vehicle_number,
        city=payload.city,
        dispatch_time=payload.dispatch_time,
        expected_delivery_time=payload.expected_delivery_time,
        total_amount=total_amount
    )
    db.add(sale)
    db.flush()

    # Auto-create payment record if due_date provided
    if payload.due_date:
        payment = models.Payment(
            sale_id=sale.id,
            total_amount=total_amount,
            paid_amount=0.0,
            remaining_amount=total_amount,
            due_date=payload.due_date,
            status=models.PaymentStatus.pending
        )
        db.add(payment)
        db.flush()
        reminder = models.Reminder(
            payment_id=payment.id,
            reminder_date=payload.due_date - timedelta(days=1),
            is_done=False
        )
        db.add(reminder)

    db.commit()
    db.refresh(sale)

    # Reload with employee relationship
    sale = db.query(models.Sale).options(joinedload(models.Sale.employee)).filter(models.Sale.id == sale.id).first()
    return _sale_to_dict(sale)


def _manager_sale_ids(manager_id: int, db: Session):
    emp_ids = [e.id for e in db.query(models.User).filter(
        models.User.parent_id == manager_id
    ).all()]
    return [manager_id] + emp_ids


@router.get("/", response_model=List[schemas.SaleOut])
def list_sales(
    employee_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Sale).options(joinedload(models.Sale.employee))

    if current_user.role == models.UserRole.employee:
        query = query.filter(models.Sale.employee_id == current_user.id)
    elif current_user.role == models.UserRole.manager:
        all_ids = _manager_sale_ids(current_user.id, db)
        if employee_id and employee_id in all_ids:
            query = query.filter(models.Sale.employee_id == employee_id)
        else:
            query = query.filter(models.Sale.employee_id.in_(all_ids))
    elif employee_id:  # owner
        query = query.filter(models.Sale.employee_id == employee_id)

    sales = query.order_by(models.Sale.created_at.desc()).all()
    return [_sale_to_dict(s) for s in sales]


@router.get("/customers/", response_model=List[dict])
def list_customers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Return unique customers (from sales) for autocomplete and customer tracking."""
    q = db.query(models.Sale).filter(models.Sale.customer_name.isnot(None))
    if current_user.role == models.UserRole.employee:
        q = q.filter(models.Sale.employee_id == current_user.id)
    elif current_user.role == models.UserRole.manager:
        all_ids = _manager_sale_ids(current_user.id, db)
        q = q.filter(models.Sale.employee_id.in_(all_ids))
    sales = q.all()

    customer_map = {}
    for s in sales:
        key = (s.customer_name or '').strip().lower()
        if not key:
            continue
        if key not in customer_map:
            customer_map[key] = {
                "customer_name": s.customer_name,
                "customer_village": s.customer_village,
                "customer_phone": s.customer_phone,
                "total_sales": 0,
                "total_amount": 0.0,
            }
        customer_map[key]["total_sales"] += 1
        customer_map[key]["total_amount"] += s.total_amount
        # Update phone if we have it
        if s.customer_phone and not customer_map[key]["customer_phone"]:
            customer_map[key]["customer_phone"] = s.customer_phone
    return sorted(customer_map.values(), key=lambda x: x["total_amount"], reverse=True)


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
