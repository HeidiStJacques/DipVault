import os
import uuid
from typing import Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/looks", tags=["looks"])

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

class LookProductIn(BaseModel):
    product_id: Optional[uuid.UUID] = None
    name_override: Optional[str] = None


class LookCreate(BaseModel):
    title: str
    notes: Optional[str] = None
    is_favorite: bool = False
    products: list[LookProductIn] = []


class LookUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    is_favorite: Optional[bool] = None
    products: Optional[list[LookProductIn]] = None


class LookPhotoOut(BaseModel):
    id: uuid.UUID
    image_url: str
    order: int
    model_config = ConfigDict(from_attributes=True)


class LookProductOut(BaseModel):
    id: uuid.UUID
    product_id: Optional[uuid.UUID] = None
    name_override: Optional[str] = None
    # Resolved display name
    display_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class LookOut(BaseModel):
    id: uuid.UUID
    title: str
    notes: Optional[str] = None
    is_favorite: bool
    created_at: str
    photos: list[LookPhotoOut] = []
    products: list[LookProductOut] = []
    model_config = ConfigDict(from_attributes=True)


def serialize_look(look: models.Look) -> dict:
    return {
        "id": str(look.id),
        "title": look.title,
        "notes": look.notes,
        "is_favorite": look.is_favorite,
        "created_at": look.created_at.isoformat() if look.created_at else None,
        "photos": [
            {"id": str(p.id), "image_url": p.image_url, "order": p.order}
            for p in sorted(look.photos, key=lambda x: x.order)
        ],
        "products": [
            {
                "id": str(lp.id),
                "product_id": str(lp.product_id) if lp.product_id else None,
                "name_override": lp.name_override,
                "display_name": (
                    lp.name_override
                    or (lp.product.name if lp.product else None)
                ),
            }
            for lp in look.products
        ],
    }


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_look(
    payload: LookCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    look = models.Look(
        user_id=current_user.id,
        title=payload.title,
        notes=payload.notes,
        is_favorite=payload.is_favorite,
    )
    db.add(look)
    db.flush()

    for item in payload.products:
        lp = models.LookProduct(
            look_id=look.id,
            product_id=item.product_id,
            name_override=item.name_override,
        )
        db.add(lp)

    db.commit()
    db.refresh(look)
    return serialize_look(look)


@router.get("/")
def list_looks(
    is_favorite: Optional[bool] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.Look).filter(models.Look.user_id == current_user.id)
    if is_favorite is not None:
        query = query.filter(models.Look.is_favorite == is_favorite)
    looks = query.order_by(models.Look.created_at.desc()).all()
    return [serialize_look(l) for l in looks]


@router.get("/{look_id}")
def get_look(
    look_id: uuid.UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    look = db.query(models.Look).filter(
        models.Look.id == look_id,
        models.Look.user_id == current_user.id,
    ).first()
    if not look:
        raise HTTPException(status_code=404, detail="Look not found")
    return serialize_look(look)


@router.put("/{look_id}")
def update_look(
    look_id: uuid.UUID,
    payload: LookUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    look = db.query(models.Look).filter(
        models.Look.id == look_id,
        models.Look.user_id == current_user.id,
    ).first()
    if not look:
        raise HTTPException(status_code=404, detail="Look not found")

    if payload.title is not None:
        look.title = payload.title
    if payload.notes is not None:
        look.notes = payload.notes
    if payload.is_favorite is not None:
        look.is_favorite = payload.is_favorite

    # Replace products if provided
    if payload.products is not None:
        for lp in look.products:
            db.delete(lp)
        db.flush()
        for item in payload.products:
            db.add(models.LookProduct(
                look_id=look.id,
                product_id=item.product_id,
                name_override=item.name_override,
            ))

    db.commit()
    db.refresh(look)
    return serialize_look(look)


@router.patch("/{look_id}/favorite")
def toggle_favorite(
    look_id: uuid.UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    look = db.query(models.Look).filter(
        models.Look.id == look_id,
        models.Look.user_id == current_user.id,
    ).first()
    if not look:
        raise HTTPException(status_code=404, detail="Look not found")
    look.is_favorite = not look.is_favorite
    db.commit()
    db.refresh(look)
    return serialize_look(look)


@router.delete("/{look_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_look(
    look_id: uuid.UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    look = db.query(models.Look).filter(
        models.Look.id == look_id,
        models.Look.user_id == current_user.id,
    ).first()
    if not look:
        raise HTTPException(status_code=404, detail="Look not found")

    # Delete photos from R2
    bucket = os.getenv("BUCKET_NAME", "dipvault-images")
    public_base = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
    try:
        s3 = get_s3()
        for photo in look.photos:
            key = photo.image_url.replace(f"{public_base}/", "")
            s3.delete_object(Bucket=bucket, Key=key)
    except Exception:
        pass

    db.delete(look)
    db.commit()
    return None


# ── Photo upload/delete ───────────────────────────────────────────────────────

@router.post("/{look_id}/photos", status_code=status.HTTP_201_CREATED)
async def add_look_photo(
    look_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    look = db.query(models.Look).filter(
        models.Look.id == look_id,
        models.Look.user_id == current_user.id,
    ).first()
    if not look:
        raise HTTPException(status_code=404, detail="Look not found")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type")

    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    key = f"looks/{current_user.id}/{look_id}/{uuid.uuid4()}.{ext}"
    bucket = os.getenv("BUCKET_NAME", "dipvault-images")
    public_base = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")

    try:
        s3 = get_s3()
        s3.put_object(Bucket=bucket, Key=key, Body=contents, ContentType=file.content_type)
    except (BotoCoreError, ClientError):
        raise HTTPException(status_code=500, detail="Failed to upload image")

    next_order = len(look.photos)
    photo = models.LookPhoto(
        look_id=look.id,
        image_url=f"{public_base}/{key}",
        order=next_order,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)

    return {"id": str(photo.id), "image_url": photo.image_url, "order": photo.order}


@router.delete("/{look_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_look_photo(
    look_id: uuid.UUID,
    photo_id: uuid.UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    look = db.query(models.Look).filter(
        models.Look.id == look_id,
        models.Look.user_id == current_user.id,
    ).first()
    if not look:
        raise HTTPException(status_code=404, detail="Look not found")

    photo = db.query(models.LookPhoto).filter(
        models.LookPhoto.id == photo_id,
        models.LookPhoto.look_id == look_id,
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    bucket = os.getenv("BUCKET_NAME", "dipvault-images")
    public_base = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
    try:
        key = photo.image_url.replace(f"{public_base}/", "")
        get_s3().delete_object(Bucket=bucket, Key=key)
    except Exception:
        pass

    db.delete(photo)
    db.commit()
    return None