import os
import uuid
from typing import Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/products", tags=["images"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
MAX_SIZE_MB = 10
MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

def get_s3():
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("R2_ENDPOINT"),
        aws_access_key_id=os.getenv("R2_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("R2_SECRET_KEY"),
    )

@router.post("/{product_id}/image", response_model=dict)
async def upload_product_image(
    product_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify product belongs to user
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.user_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: JPEG, PNG, WebP, HEIC"
        )

    # Read and validate size
    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_SIZE_MB}MB"
        )

    # Build a unique key
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    key = f"products/{current_user.id}/{product_id}/{uuid.uuid4()}.{ext}"

    bucket = os.getenv("BUCKET_NAME", "dipvault-images")
    public_base = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")

    try:
        s3 = get_s3()
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=contents,
            ContentType=file.content_type,
        )
    except (BotoCoreError, ClientError) as e:
        raise HTTPException(status_code=500, detail="Failed to upload image")

    # Delete old image from R2 if there was one
    if product.image_url:
        try:
            old_key = product.image_url.replace(f"{public_base}/", "")
            s3.delete_object(Bucket=bucket, Key=old_key)
        except Exception:
            pass  # Non-fatal — old file cleanup best effort

    # Save URL to product
    image_url = f"{public_base}/{key}"
    product.image_url = image_url
    db.commit()

    return {"image_url": image_url}


@router.delete("/{product_id}/image", response_model=dict)
def delete_product_image(
    product_id: uuid.UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.user_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if not product.image_url:
        raise HTTPException(status_code=404, detail="No image to delete")

    public_base = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
    bucket = os.getenv("BUCKET_NAME", "dipvault-images")

    try:
        key = product.image_url.replace(f"{public_base}/", "")
        s3 = get_s3()
        s3.delete_object(Bucket=bucket, Key=key)
    except Exception:
        pass  # Non-fatal

    product.image_url = None
    db.commit()

    return {"message": "Image deleted"}