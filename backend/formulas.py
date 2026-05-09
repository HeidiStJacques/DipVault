import os
import uuid
from typing import Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/formulas", tags=["formulas"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
MAX_SIZE_BYTES = 10 * 1024 * 1024


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("R2_ENDPOINT"),
        aws_access_key_id=os.getenv("R2_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("R2_SECRET_KEY"),
    )


# ── Schemas ──────────────────────────────────────────────────────────────────

class IngredientIn(BaseModel):
    product_id: Optional[uuid.UUID] = None
    name_override: Optional[str] = None
    measurement: Optional[str] = None
    order: int = 0


class FormulaCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    notes: Optional[str] = None
    star_rating: Optional[int] = Field(None, ge=1, le=5)
    ingredients: list[IngredientIn] = []


class FormulaUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    notes: Optional[str] = None
    star_rating: Optional[int] = Field(None, ge=1, le=5)
    ingredients: Optional[list[IngredientIn]] = None


def serialize_formula(f: models.Formula) -> dict:
    return {
        "id": str(f.id),
        "title": f.title,
        "notes": f.notes,
        "star_rating": f.star_rating,
        "image_url": f.image_url,
        "created_at": f.created_at.isoformat() if f.created_at else None,
        "ingredients": [
            {
                "id": str(i.id),
                "product_id": str(i.product_id) if i.product_id else None,
                "name_override": i.name_override,
                "measurement": i.measurement,
                "order": i.order,
                "display_name": i.name_override or (i.product.name if i.product else None),
            }
            for i in sorted(f.ingredients, key=lambda x: x.order)
        ],
    }


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_formula(
    payload: FormulaCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    formula = models.Formula(
        user_id=current_user.id,
        title=payload.title,
        notes=payload.notes,
        star_rating=payload.star_rating,
    )
    db.add(formula)
    db.flush()

    for i, item in enumerate(payload.ingredients):
        db.add(models.FormulaIngredient(
            formula_id=formula.id,
            product_id=item.product_id,
            name_override=item.name_override,
            measurement=item.measurement,
            order=item.order if item.order else i,
        ))

    db.commit()
    db.refresh(formula)
    return serialize_formula(formula)


@router.get("/")
def list_formulas(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    formulas = db.query(models.Formula).filter(
        models.Formula.user_id == current_user.id
    ).order_by(models.Formula.created_at.desc()).all()
    return [serialize_formula(f) for f in formulas]


@router.get("/{formula_id}")
def get_formula(
    formula_id: uuid.UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    formula = db.query(models.Formula).filter(
        models.Formula.id == formula_id,
        models.Formula.user_id == current_user.id,
    ).first()
    if not formula:
        raise HTTPException(status_code=404, detail="Formula not found")
    return serialize_formula(formula)


@router.put("/{formula_id}")
def update_formula(
    formula_id: uuid.UUID,
    payload: FormulaUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    formula = db.query(models.Formula).filter(
        models.Formula.id == formula_id,
        models.Formula.user_id == current_user.id,
    ).first()
    if not formula:
        raise HTTPException(status_code=404, detail="Formula not found")

    if payload.title is not None:
        formula.title = payload.title
    if payload.notes is not None:
        formula.notes = payload.notes
    if payload.star_rating is not None:
        formula.star_rating = payload.star_rating

    if payload.ingredients is not None:
        for ing in formula.ingredients:
            db.delete(ing)
        db.flush()
        for i, item in enumerate(payload.ingredients):
            db.add(models.FormulaIngredient(
                formula_id=formula.id,
                product_id=item.product_id,
                name_override=item.name_override,
                measurement=item.measurement,
                order=item.order if item.order else i,
            ))

    db.commit()
    db.refresh(formula)
    return serialize_formula(formula)


@router.delete("/{formula_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_formula(
    formula_id: uuid.UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    formula = db.query(models.Formula).filter(
        models.Formula.id == formula_id,
        models.Formula.user_id == current_user.id,
    ).first()
    if not formula:
        raise HTTPException(status_code=404, detail="Formula not found")

    # Delete image from R2 if exists
    if formula.image_url:
        try:
            public_base = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
            key = formula.image_url.replace(f"{public_base}/", "")
            get_s3().delete_object(Bucket=os.getenv("BUCKET_NAME", "dipvault-images"), Key=key)
        except Exception:
            pass

    db.delete(formula)
    db.commit()
    return None


@router.post("/{formula_id}/image", status_code=status.HTTP_201_CREATED)
async def upload_formula_image(
    formula_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    formula = db.query(models.Formula).filter(
        models.Formula.id == formula_id,
        models.Formula.user_id == current_user.id,
    ).first()
    if not formula:
        raise HTTPException(status_code=404, detail="Formula not found")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type")

    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    key = f"formulas/{current_user.id}/{formula_id}/{uuid.uuid4()}.{ext}"
    bucket = os.getenv("BUCKET_NAME", "dipvault-images")
    public_base = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")

    try:
        get_s3().put_object(Bucket=bucket, Key=key, Body=contents, ContentType=file.content_type)
    except (BotoCoreError, ClientError):
        raise HTTPException(status_code=500, detail="Failed to upload image")

    # Delete old image
    if formula.image_url:
        try:
            old_key = formula.image_url.replace(f"{public_base}/", "")
            get_s3().delete_object(Bucket=bucket, Key=old_key)
        except Exception:
            pass

    formula.image_url = f"{public_base}/{key}"
    db.commit()
    return {"image_url": formula.image_url}


@router.delete("/{formula_id}/image", status_code=status.HTTP_204_NO_CONTENT)
def delete_formula_image(
    formula_id: uuid.UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    formula = db.query(models.Formula).filter(
        models.Formula.id == formula_id,
        models.Formula.user_id == current_user.id,
    ).first()
    if not formula:
        raise HTTPException(status_code=404, detail="Formula not found")
    if not formula.image_url:
        raise HTTPException(status_code=404, detail="No image to delete")

    try:
        public_base = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
        key = formula.image_url.replace(f"{public_base}/", "")
        get_s3().delete_object(Bucket=os.getenv("BUCKET_NAME", "dipvault-images"), Key=key)
    except Exception:
        pass

    formula.image_url = None
    db.commit()
    return None