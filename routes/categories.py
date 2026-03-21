from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from auth_utils import require_manager, get_current_user

router = APIRouter(tags=["Categories & Box Types"])


# ─── Mango Categories ────────────────────────────────────────────────────────

@router.post("/mango-categories", response_model=schemas.MangoCategoryOut, status_code=201)
def create_mango_category(
    payload: schemas.MangoCategoryCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    existing = db.query(models.MangoCategory).filter(models.MangoCategory.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    cat = models.MangoCategory(
        name=payload.name,
        category_number=payload.category_number,
        description=payload.description
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.get("/mango-categories", response_model=List[schemas.MangoCategoryOut])
def list_mango_categories(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user)
):
    return db.query(models.MangoCategory).all()


@router.delete("/mango-categories/{category_id}", status_code=204)
def delete_mango_category(
    category_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    cat = db.query(models.MangoCategory).filter(models.MangoCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()


# ─── Box Types ───────────────────────────────────────────────────────────────

@router.post("/box-types", response_model=schemas.BoxTypeOut, status_code=201)
def create_box_type(
    payload: schemas.BoxTypeCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    existing = db.query(models.BoxType).filter(
        models.BoxType.brand_name == payload.brand_name,
        models.BoxType.size == payload.size,
        models.BoxType.box_weight == payload.box_weight
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Box type already exists")

    box = models.BoxType(
        brand_name=payload.brand_name,
        size=payload.size,
        box_weight=payload.box_weight
    )
    db.add(box)
    db.commit()
    db.refresh(box)
    return box


@router.get("/box-types", response_model=List[schemas.BoxTypeOut])
def list_box_types(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user)
):
    return db.query(models.BoxType).all()


@router.delete("/box-types/{box_type_id}", status_code=204)
def delete_box_type(
    box_type_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager)
):
    box = db.query(models.BoxType).filter(models.BoxType.id == box_type_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Box type not found")
    db.delete(box)
    db.commit()
