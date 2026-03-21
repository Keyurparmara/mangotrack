from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from auth_utils import require_manager

router = APIRouter(prefix="/purchases", tags=["Purchases"])


def _validate_purchase_item(item: schemas.PurchaseItemCreate, db: Session):
    if item.item_type == models.ItemType.mango:
        if item.mango_category_id is None or item.size is None:
            raise HTTPException(
                status_code=400,
                detail="Mango items require mango_category_id and size"
            )
        cat = db.query(models.MangoCategory).filter(
            models.MangoCategory.id == item.mango_category_id
        ).first()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Mango category {item.mango_category_id} not found")

    elif item.item_type == models.ItemType.empty_box:
        if item.box_type_id is None:
            raise HTTPException(
                status_code=400,
                detail="Empty box items require box_type_id"
            )
        bt = db.query(models.BoxType).filter(models.BoxType.id == item.box_type_id).first()
        if not bt:
            raise HTTPException(status_code=404, detail=f"Box type {item.box_type_id} not found")


@router.post("/", response_model=schemas.PurchaseOut, status_code=201)
def create_purchase(
    payload: schemas.PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager)
):
    for item in payload.items:
        _validate_purchase_item(item, db)

    purchase = models.Purchase(
        city_name=payload.city_name,
        company_name=payload.company_name,
        vehicle_number=payload.vehicle_number,
        unload_employee=payload.unload_employee,
        purchase_datetime=payload.purchase_datetime,
        created_by=current_user.id
    )
    db.add(purchase)
    db.flush()

    for item_data in payload.items:
        purchase_item = models.PurchaseItem(
            purchase_id=purchase.id,
            item_type=item_data.item_type,
            mango_category_id=item_data.mango_category_id,
            size=item_data.size,
            box_type_id=item_data.box_type_id,
            quantity=item_data.quantity,
            price_per_unit=item_data.price_per_unit
        )
        db.add(purchase_item)

    db.commit()
    db.refresh(purchase)
    return purchase


@router.post("/{purchase_id}/items", response_model=schemas.PurchaseItemOut, status_code=201)
def add_purchase_item(
    purchase_id: int,
    payload: schemas.PurchaseItemCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    purchase = db.query(models.Purchase).filter(models.Purchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    _validate_purchase_item(payload, db)

    item = models.PurchaseItem(
        purchase_id=purchase_id,
        item_type=payload.item_type,
        mango_category_id=payload.mango_category_id,
        size=payload.size,
        box_type_id=payload.box_type_id,
        quantity=payload.quantity,
        price_per_unit=payload.price_per_unit
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/", response_model=List[schemas.PurchaseOut])
def list_purchases(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager)
):
    q = db.query(models.Purchase).order_by(models.Purchase.created_at.desc())
    if current_user.role == models.UserRole.manager:
        q = q.filter(models.Purchase.created_by == current_user.id)
    return q.all()


@router.get("/{purchase_id}", response_model=schemas.PurchaseOut)
def get_purchase(
    purchase_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager)
):
    purchase = db.query(models.Purchase).filter(models.Purchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    if current_user.role == models.UserRole.manager and purchase.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return purchase
