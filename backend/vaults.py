from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/vaults", tags=["vaults"])


class VaultCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None


class VaultOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    user_id: UUID

    model_config = ConfigDict(from_attributes=True)


@router.post("/", response_model=VaultOut, status_code=status.HTTP_201_CREATED)
def create_vault(
    payload: VaultCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vault = models.Vault(
        name=payload.name,
        description=payload.description,
        user_id=current_user.id,
    )

    db.add(vault)
    db.commit()
    db.refresh(vault)

    return vault


@router.get("/", response_model=list[VaultOut])
def list_vaults(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vaults = db.query(models.Vault).filter(models.Vault.user_id == current_user.id).all()
    return vaults


@router.get("/{vault_id}", response_model=VaultOut)
def get_vault(
    vault_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vault = (
        db.query(models.Vault)
        .filter(models.Vault.id == vault_id, models.Vault.user_id == current_user.id)
        .first()
    )

    if not vault:
        raise HTTPException(status_code=404, detail="Vault not found")

    return vault

@router.put("/{vault_id}", response_model=VaultOut)
def update_vault(
    vault_id: UUID,
    payload: VaultCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a vault. Only the owner can update it."""
    vault = (
        db.query(models.Vault)
        .filter(models.Vault.id == vault_id, models.Vault.user_id == current_user.id)
        .first()
    )

    if not vault:
        raise HTTPException(status_code=404, detail="Vault not found")

    vault.name = payload.name
    vault.description = payload.description

    db.commit()
    db.refresh(vault)

    return vault


@router.delete("/{vault_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vault(
    vault_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a vault. Only the owner can delete it."""
    vault = (
        db.query(models.Vault)
        .filter(models.Vault.id == vault_id, models.Vault.user_id == current_user.id)
        .first()
    )

    if not vault:
        raise HTTPException(status_code=404, detail="Vault not found")

    db.delete(vault)
    db.commit()

    return None