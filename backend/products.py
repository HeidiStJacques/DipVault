from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/products", tags=["products"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    brand: Optional[str] = None
    shade_name: Optional[str] = None
    type: Optional[str] = None
    finish: Optional[str] = None
    color_family: Optional[str] = None
    collection_name: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    quantity: int = 1
    low_stock_threshold: int = 1
    status: str = "active"
    is_favorite: bool = False
    swatched: bool = False
    is_archived: bool = False
    image_url: Optional[str] = None
    vault_ids: list[UUID] = []     


class ProductUpdate(ProductCreate):
    pass


class VaultRef(BaseModel):
    id: UUID
    name: str
    model_config = ConfigDict(from_attributes=True)


class ProductOut(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    brand: Optional[str] = None
    shade_name: Optional[str] = None
    type: Optional[str] = None
    finish: Optional[str] = None
    color_family: Optional[str] = None
    collection_name: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    quantity: int
    low_stock_threshold: int
    status: str
    is_favorite: bool
    swatched: bool
    is_archived: bool
    image_url: Optional[str] = None
    vaults: list[VaultRef] = []         # ← now a list of vault refs

    model_config = ConfigDict(from_attributes=True)


def resolve_vaults(vault_ids: list[UUID], user_id, db: Session) -> list[models.Vault]:
    """Fetch and validate vaults belong to user."""
    vaults = []
    for vid in vault_ids:
        vault = db.query(models.Vault).filter(
            models.Vault.id == vid,
            models.Vault.user_id == user_id,
        ).first()
        if not vault:
            raise HTTPException(status_code=404, detail=f"Vault {vid} not found")
        vaults.append(vault)
    return vaults


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vaults = resolve_vaults(payload.vault_ids, current_user.id, db)

    product_data = payload.model_dump(exclude={"vault_ids"})
    product = models.Product(**product_data, user_id=current_user.id)
    product.vaults = vaults

    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/", response_model=list[ProductOut])
def list_products(
    vault_id: Optional[UUID] = None,
    is_favorite: Optional[bool] = None,
    include_archived: bool = False,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.Product).filter(models.Product.user_id == current_user.id)

    if vault_id:
        query = query.filter(models.Product.vaults.any(models.Vault.id == vault_id))

    if is_favorite is not None:
        query = query.filter(models.Product.is_favorite == is_favorite)

    if not include_archived:
        query = query.filter(models.Product.is_archived == False)

    return query.order_by(models.Product.created_at.desc()).all()


@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.user_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.user_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    vaults = resolve_vaults(payload.vault_ids, current_user.id, db)

    for field, value in payload.model_dump(exclude={"vault_ids"}, exclude_unset=True).items():
        setattr(product, field, value)

    product.vaults = vaults

    db.commit()
    db.refresh(product)
    return product


@router.patch("/{product_id}/favorite", response_model=ProductOut)
def toggle_favorite(
    product_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.user_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_favorite = not product.is_favorite
    db.commit()
    db.refresh(product)
    return product


@router.patch("/{product_id}/archive", response_model=ProductOut)
def toggle_archive(
    product_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.user_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_archived = not product.is_archived
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.user_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return None