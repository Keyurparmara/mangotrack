from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from database import get_db
import models
import schemas
from auth_utils import require_manager, get_current_user

router = APIRouter(prefix="/stock", tags=["Stock"])


def _get_scope(current_user: models.User, db: Session):
    """Returns (manager_id, sale_ids) for scoping stock to a manager."""
    if current_user.role == models.UserRole.owner:
        return None, None
    mid = current_user.id
    emp_ids = [e.id for e in db.query(models.User).filter(
        models.User.parent_id == mid
    ).all()]
    return mid, [mid] + emp_ids


def _build_mango_stock(db: Session, manager_id=None, sale_emp_ids=None) -> List[schemas.MangoStockItem]:
    pq = db.query(
        models.PurchaseItem.mango_category_id,
        models.PurchaseItem.size,
        func.sum(models.PurchaseItem.quantity).label("total")
    ).join(models.Purchase).filter(models.PurchaseItem.item_type == models.ItemType.mango)
    if manager_id is not None:
        pq = pq.filter(models.Purchase.created_by == manager_id)
    pq = pq.group_by(models.PurchaseItem.mango_category_id, models.PurchaseItem.size).all()

    sq = db.query(
        models.Sale.mango_category_id,
        models.Sale.size,
        func.coalesce(func.sum(models.Sale.quantity), 0).label("total")
    ).filter(models.Sale.mango_category_id.isnot(None))
    if sale_emp_ids is not None:
        sq = sq.filter(models.Sale.employee_id.in_(sale_emp_ids))
    sq = sq.group_by(models.Sale.mango_category_id, models.Sale.size).all()

    sold_map = {(r.mango_category_id, r.size): int(r.total) for r in sq}
    cats = {c.id: c for c in db.query(models.MangoCategory).all()}

    result = []
    for row in pq:
        cat = cats.get(row.mango_category_id)
        purchased_qty = int(row.total)
        sold_qty = sold_map.get((row.mango_category_id, row.size), 0)
        result.append(schemas.MangoStockItem(
            mango_category_id=row.mango_category_id,
            mango_category_name=cat.name if cat else "Unknown",
            category_number=cat.category_number if cat else 0,
            size=row.size,
            purchased=purchased_qty,
            sold=sold_qty,
            available=purchased_qty - sold_qty
        ))
    return result


def _build_box_stock(db: Session, manager_id=None) -> List[schemas.BoxStockItem]:
    bq = db.query(
        models.PurchaseItem.box_type_id,
        func.sum(models.PurchaseItem.quantity).label("total")
    ).join(models.Purchase).filter(models.PurchaseItem.item_type == models.ItemType.empty_box)
    if manager_id is not None:
        bq = bq.filter(models.Purchase.created_by == manager_id)
    bq = bq.group_by(models.PurchaseItem.box_type_id).all()

    box_types = {bt.id: bt for bt in db.query(models.BoxType).all()}
    result = []
    for row in bq:
        bt = box_types.get(row.box_type_id)
        if not bt:
            continue
        result.append(schemas.BoxStockItem(
            box_type_id=row.box_type_id,
            brand_name=bt.brand_name,
            size=bt.size,
            box_weight=bt.box_weight,
            purchased=int(row.total),
            available=int(row.total)
        ))
    return result


@router.get("/", response_model=schemas.StockResponse)
def get_stock(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    mid, sids = _get_scope(current_user, db)
    return schemas.StockResponse(
        mango=_build_mango_stock(db, mid, sids),
        empty_boxes=_build_box_stock(db, mid)
    )


@router.get("/mango", response_model=List[schemas.MangoStockItem])
def get_mango_stock(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    mid, sids = _get_scope(current_user, db)
    return _build_mango_stock(db, mid, sids)


@router.get("/boxes", response_model=List[schemas.BoxStockItem])
def get_box_stock(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    mid, _ = _get_scope(current_user, db)
    return _build_box_stock(db, mid)
