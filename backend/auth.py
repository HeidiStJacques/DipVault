import os
import uuid
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

import boto3
import jwt
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from database import get_db
import models
from config import JWT_SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_DELTA

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
MAX_IMAGE_SIZE_MB = 10
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("R2_ENDPOINT"),
        aws_access_key_id=os.getenv("R2_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("R2_SECRET_KEY"),
    )


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or ACCESS_TOKEN_EXPIRE_DELTA)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=6)
    new_password: str = Field(min_length=6)


class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = Field(None, max_length=100)


class MessageResponse(BaseModel):
    message: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    display_name: Optional[str] = None
    profile_image_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


def get_user_by_id(user_id: str, db: Session) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> models.User:
    token = credentials.credentials

    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    user = get_user_by_id(user_id, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


@router.post("/signup", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = pwd_context.hash(payload.password)
    user = models.User(
        email=payload.email,
        password_hash=hashed_password
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return MessageResponse(message="User created")


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": str(user.id)})

    return LoginResponse(access_token=access_token)


@router.get("/me", response_model=UserOut)
def read_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_profile(
    payload: UpdateProfileRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)

    return current_user


@router.post("/me/photo", response_model=UserOut)
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Allowed: JPEG, PNG, WebP, HEIC"
        )

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_IMAGE_SIZE_MB}MB"
        )

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    key = f"profile/{current_user.id}/{uuid.uuid4()}.{ext}"

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
    except (BotoCoreError, ClientError):
        raise HTTPException(status_code=500, detail="Failed to upload image")

    # Delete old profile photo from R2 if there was one
    if current_user.profile_image_url:
        try:
            old_key = current_user.profile_image_url.replace(f"{public_base}/", "")
            s3.delete_object(Bucket=bucket, Key=old_key)
        except Exception:
            pass  # Non-fatal — old file cleanup best effort

    current_user.profile_image_url = f"{public_base}/{key}"
    db.commit()
    db.refresh(current_user)

    return current_user


@router.delete("/me/photo", response_model=UserOut)
def delete_profile_photo(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.profile_image_url:
        raise HTTPException(status_code=404, detail="No profile photo to delete")

    public_base = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
    bucket = os.getenv("BUCKET_NAME", "dipvault-images")

    try:
        key = current_user.profile_image_url.replace(f"{public_base}/", "")
        s3 = get_s3()
        s3.delete_object(Bucket=bucket, Key=key)
    except Exception:
        pass  # Non-fatal

    current_user.profile_image_url = None
    db.commit()
    db.refresh(current_user)

    return current_user


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.password_hash = pwd_context.hash(payload.new_password)
    db.commit()

    return MessageResponse(message="Password updated successfully")


@router.delete("/delete-account", response_model=MessageResponse)
def delete_account(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.delete(current_user)
    db.commit()

    return MessageResponse(message="Account deleted")


@router.get("/dashboard", response_model=MessageResponse)
def dashboard(current_user: models.User = Depends(get_current_user)):
    return MessageResponse(message=f"Welcome {current_user.email}")
