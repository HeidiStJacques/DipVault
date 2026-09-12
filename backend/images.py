import os
import uuid

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db


router = APIRouter(prefix="/products", tags=["images"])

ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
}

MAX_SIZE_MB = 10
MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
MAX_PRODUCT_PHOTOS = 4


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("R2_ENDPOINT"),
        aws_access_key_id=os.getenv("R2_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("R2_SECRET_KEY"),
    )


def get_product_for_user(
    product_id: uuid.UUID,
    current_user: models.User,
    db: Session,
) -> models.Product:
    # TEMP DEBUG LOG - remove after diagnosing
    print(f"DEBUG: looking for product_id={product_id!r} (type={type(product_id)}) for current_user.id={current_user.id!r} (type={type(current_user.id)})")

    product = (
        db.query(models.Product)
        .filter(
            models.Product.id == product_id,
            models.Product.user_id == current_user.id,
        )
        .first()
    )

    # TEMP DEBUG LOG - remove after diagnosing
    if not product:
        all_user_products = (
            db.query(models.Product)
            .filter(models.Product.user_id == current_user.id)
            .all()
        )
        print(f"DEBUG: no match. this user's existing product ids: {[str(p.id) for p in all_user_products]}")

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    return product


async def upload_file_to_r2(
    file: UploadFile,
    current_user_id,
    product_id,
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Allowed: JPEG, PNG, WebP, HEIC",
        )

    contents = await file.read()

    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_SIZE_MB}MB",
        )

    ext = (
        file.filename.rsplit(".", 1)[-1].lower()
        if file.filename and "." in file.filename
        else "jpg"
    )

    key = (
        f"products/{current_user_id}/"
        f"{product_id}/{uuid.uuid4()}.{ext}"
    )

    bucket = os.getenv(
        "BUCKET_NAME",
        "dipvault-images",
    )

    public_base = os.getenv(
        "PUBLIC_BASE_URL",
        "",
    ).rstrip("/")

    try:
        s3 = get_s3()

        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=contents,
            ContentType=file.content_type,
        )

    except (BotoCoreError, ClientError):
        raise HTTPException(
            status_code=500,
            detail="Failed to upload image",
        )

    return f"{public_base}/{key}"


def delete_file_from_r2(image_url: str):
    if not image_url:
        return

    public_base = os.getenv(
        "PUBLIC_BASE_URL",
        "",
    ).rstrip("/")

    bucket = os.getenv(
        "BUCKET_NAME",
        "dipvault-images",
    )

    try:
        key = image_url.replace(
            f"{public_base}/",
            "",
        )

        s3 = get_s3()

        s3.delete_object(
            Bucket=bucket,
            Key=key,
        )

    except Exception:
        pass


# ─────────────────────────────────────────────
# NEW MULTI-PHOTO ENDPOINTS
# ─────────────────────────────────────────────


@router.post(
    "/{product_id}/photos",
    response_model=dict,
)
async def upload_product_photo(
    product_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = get_product_for_user(
        product_id,
        current_user,
        db,
    )

    existing_count = (
        db.query(models.ProductPhoto)
        .filter(
            models.ProductPhoto.product_id
            == product.id
        )
        .count()
    )

    if existing_count >= MAX_PRODUCT_PHOTOS:
        raise HTTPException(
            status_code=400,
            detail="A product can have a maximum of 4 photos.",
        )

    image_url = await upload_file_to_r2(
        file,
        current_user.id,
        product.id,
    )

    photo = models.ProductPhoto(
        product_id=product.id,
        image_url=image_url,
        order=existing_count,
    )

    db.add(photo)

    # Keep legacy image_url in sync with the first photo
    if existing_count == 0:
        product.image_url = image_url

    db.commit()
    db.refresh(photo)

    return {
        "id": str(photo.id),
        "image_url": photo.image_url,
        "order": photo.order,
    }


@router.delete(
    "/{product_id}/photos/{photo_id}",
    response_model=dict,
)
def delete_product_photo(
    product_id: uuid.UUID,
    photo_id: uuid.UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = get_product_for_user(
        product_id,
        current_user,
        db,
    )

    photo = (
        db.query(models.ProductPhoto)
        .filter(
            models.ProductPhoto.id == photo_id,
            models.ProductPhoto.product_id
            == product.id,
        )
        .first()
    )

    if not photo:
        raise HTTPException(
            status_code=404,
            detail="Photo not found",
        )

    deleted_url = photo.image_url

    delete_file_from_r2(
        deleted_url
    )

    db.delete(photo)
    db.flush()

    remaining_photos = (
        db.query(models.ProductPhoto)
        .filter(
            models.ProductPhoto.product_id
            == product.id
        )
        .order_by(
            models.ProductPhoto.order
        )
        .all()
    )

    # Re-number remaining photos
    for index, remaining in enumerate(
        remaining_photos
    ):
        remaining.order = index

    # Keep legacy image_url pointing to first photo
    if remaining_photos:
        product.image_url = (
            remaining_photos[0].image_url
        )
    else:
        product.image_url = None

    db.commit()

    return {
        "message": "Photo deleted"
    }


# ─────────────────────────────────────────────
# LEGACY SINGLE-PHOTO ENDPOINTS
# KEEP THESE TEMPORARILY SO EXISTING APP CODE
# DOES NOT BREAK WHILE WE CONVERT THE FRONTEND
# ─────────────────────────────────────────────


@router.post(
    "/{product_id}/image",
    response_model=dict,
)
async def upload_product_image(
    product_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = get_product_for_user(
        product_id,
        current_user,
        db,
    )

    image_url = await upload_file_to_r2(
        file,
        current_user.id,
        product.id,
    )

    # Delete previous legacy image if needed
    if product.image_url:
        delete_file_from_r2(
            product.image_url
        )

    product.image_url = image_url

    db.commit()

    return {
        "image_url": image_url
    }


@router.delete(
    "/{product_id}/image",
    response_model=dict,
)
def delete_product_image(
    product_id: uuid.UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = get_product_for_user(
        product_id,
        current_user,
        db,
    )

    if not product.image_url:
        raise HTTPException(
            status_code=404,
            detail="No image to delete",
        )

    delete_file_from_r2(
        product.image_url
    )

    product.image_url = None

    db.commit()

    return {
        "message": "Image deleted"
    }
