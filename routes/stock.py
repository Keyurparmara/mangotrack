from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from database import get_db
import models
import schemas
from auth_utils import require_manager, get_current_user

router = APIRouter(prefix="/stock", tags=["Stock"])


def _build_mango_stock(db: Session) -> List[schemas.MangoStockItem]:
    mango_purchased = (
        db.query(
            models.PurchaseItem.mango_category_id,
            models.PurchaseItem.size,
            func.sum(models.PurchaseItem.quantity).label("total")
        )
        .filter(models.PurchaseItem.item_type == models.ItemType.mango)
        .group_by(models.PurchaseItem.mango_category_id, models.PurchaseItem.size)
        .all()
    )

    mango_sold = (
        db.query(
            models.Sale.mango_category_id,
            models.Sale.size,
            func.coalesce(func.sum(models.Sale.quantity), 0).label("total")
        )
        .filter(models.Sale.mango_category_id.isnot(None))
        .group_by(models.Sale.mango_category_id, models.Sale.size)
        .all()
    )

    sold_map = {(row.mango_category_id, row.size): int(row.total) for row in mango_sold}
    cats = {c.id: c for c in db.query(models.MangoCategory).all()}

    result = []
    for row in mango_purchased:
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


def _build_box_stock(db: Session) -> List[schemas.BoxStockItem]:
    box_purchased = (
        db.query(
            models.PurchaseItem.box_type_id,
            func.sum(models.PurchaseItem.quantity).label("total")
        )
        .filter(models.PurchaseItem.item_type == models.ItemType.empty_box)
        .group_by(models.PurchaseItem.box_type_id)
        .all()
    )

    box_types = {bt.id: bt for bt in db.query(models.BoxType).all()}

    result = []
    for row in box_purchased:
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
def get_stock(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user)
):
    return schemas.StockResponse(
        mango=_build_mango_stock(db),
        empty_boxes=_build_box_stock(db)
    )


@router.get("/mango", response_model=List[schemas.MangoStockItem])
def get_mango_stock(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user)
):
    return _build_mango_stock(db)


@router.get("/boxes", response_model=List[schemas.BoxStockItem])
def get_box_stock(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user)
):
    return _build_box_stock(db)
