import csv
import io
import json
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/tools", tags=["tools"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class ToolCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    type: Optional[str] = None
    brand: Optional[str] = None
    purchase_date: Optional[date] = None
    notes: Optional[str] = None


class ToolUpdate(ToolCreate):
    pass


class ToolOut(BaseModel):
    id: UUID
    name: str
    type: Optional[str] = None
    brand: Optional[str] = None
    purchase_date: Optional[date] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ── Tool CRUD ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=ToolOut, status_code=status.HTTP_201_CREATED)
def create_tool(
    payload: ToolCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tool = models.Tool(**payload.model_dump(), user_id=current_user.id)
    db.add(tool)
    db.commit()
    db.refresh(tool)
    return tool


@router.get("/", response_model=list[ToolOut])
def list_tools(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.Tool).filter(
        models.Tool.user_id == current_user.id
    ).order_by(models.Tool.created_at.desc()).all()


@router.get("/{tool_id}", response_model=ToolOut)
def get_tool(
    tool_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tool = db.query(models.Tool).filter(
        models.Tool.id == tool_id,
        models.Tool.user_id == current_user.id,
    ).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return tool


@router.put("/{tool_id}", response_model=ToolOut)
def update_tool(
    tool_id: UUID,
    payload: ToolUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tool = db.query(models.Tool).filter(
        models.Tool.id == tool_id,
        models.Tool.user_id == current_user.id,
    ).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tool, field, value)

    db.commit()
    db.refresh(tool)
    return tool


@router.delete("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tool(
    tool_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tool = db.query(models.Tool).filter(
        models.Tool.id == tool_id,
        models.Tool.user_id == current_user.id,
    ).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    db.delete(tool)
    db.commit()
    return None


# ── Export ────────────────────────────────────────────────────────────────────

@router.get("/export/all")
def export_all(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export all user data as JSON."""
    vaults = db.query(models.Vault).filter(models.Vault.user_id == current_user.id).all()
    products = db.query(models.Product).filter(models.Product.user_id == current_user.id).all()
    tools = db.query(models.Tool).filter(models.Tool.user_id == current_user.id).all()
    formulas = db.query(models.Formula).filter(models.Formula.user_id == current_user.id).all()

    def to_dict(obj, fields):
        result = {}
        for f in fields:
            val = getattr(obj, f, None)
            if hasattr(val, 'isoformat'):
                val = val.isoformat()
            elif hasattr(val, '__str__') and not isinstance(val, (str, int, float, bool, type(None))):
                val = str(val)
            result[f] = val
        return result

    data = {
        "exported_at": date.today().isoformat(),
        "user": current_user.email,
        "vaults": [to_dict(v, ["id", "name", "description", "created_at"]) for v in vaults],
        "products": [to_dict(p, [
            "id", "vault_id", "name", "brand", "shade_name", "type", "finish",
            "color_family", "collection_name", "sku", "description", "notes",
            "purchase_date", "purchase_price", "quantity", "low_stock_threshold",
            "status", "is_favorite", "swatched", "is_archived", "image_url", "created_at",
        ]) for p in products],
        "tools": [to_dict(t, ["id", "name", "type", "brand", "purchase_date", "notes"]) for t in tools],
        "formulas": [
            {
                **to_dict(f, ["id", "title", "notes", "star_rating", "image_url", "created_at"]),
                "ingredients": [
                    to_dict(i, ["name_override", "measurement", "order"])
                    for i in f.ingredients
                ],
            }
            for f in formulas
        ],
    }

    json_bytes = json.dumps(data, indent=2).encode("utf-8")
    return StreamingResponse(
        io.BytesIO(json_bytes),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=dipvault-export-{date.today()}.json"},
    )


@router.get("/export/products/csv")
def export_products_csv(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export products as CSV."""
    products = db.query(models.Product).filter(models.Product.user_id == current_user.id).all()

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "name", "brand", "shade_name", "type", "finish", "color_family",
        "collection_name", "sku", "purchase_date", "purchase_price",
        "quantity", "status", "is_favorite", "swatched", "notes",
    ])
    writer.writeheader()
    for p in products:
        writer.writerow({
            "name": p.name, "brand": p.brand or "", "shade_name": p.shade_name or "",
            "type": p.type or "", "finish": p.finish or "", "color_family": p.color_family or "",
            "collection_name": p.collection_name or "", "sku": p.sku or "",
            "purchase_date": p.purchase_date.isoformat() if p.purchase_date else "",
            "purchase_price": str(p.purchase_price) if p.purchase_price else "",
            "quantity": p.quantity, "status": p.status,
            "is_favorite": p.is_favorite, "swatched": p.swatched, "notes": p.notes or "",
        })

    csv_bytes = output.getvalue().encode("utf-8")
    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=dipvault-products-{date.today()}.csv"},
    )


# ── Import ────────────────────────────────────────────────────────────────────

@router.post("/import/products/csv")
async def import_products_csv(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Import products from a CSV file. Matches export format."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv")

    contents = await file.read()
    reader = csv.DictReader(io.StringIO(contents.decode("utf-8")))

    imported = 0
    errors = []

    for i, row in enumerate(reader):
        try:
            product = models.Product(
                user_id=current_user.id,
                name=row.get("name", "").strip(),
                brand=row.get("brand", "").strip() or None,
                shade_name=row.get("shade_name", "").strip() or None,
                type=row.get("type", "").strip() or None,
                finish=row.get("finish", "").strip() or None,
                color_family=row.get("color_family", "").strip() or None,
                collection_name=row.get("collection_name", "").strip() or None,
                sku=row.get("sku", "").strip() or None,
                purchase_date=date.fromisoformat(row["purchase_date"]) if row.get("purchase_date", "").strip() else None,
                purchase_price=float(row["purchase_price"]) if row.get("purchase_price", "").strip() else None,
                quantity=int(row.get("quantity", 1) or 1),
                status=row.get("status", "active").strip() or "active",
                is_favorite=str(row.get("is_favorite", "")).lower() in ("true", "1", "yes"),
                swatched=str(row.get("swatched", "")).lower() in ("true", "1", "yes"),
                notes=row.get("notes", "").strip() or None,
            )
            if not product.name:
                errors.append(f"Row {i + 2}: missing name, skipped")
                continue
            db.add(product)
            imported += 1
        except Exception as e:
            errors.append(f"Row {i + 2}: {str(e)}")

    db.commit()
    return {"imported": imported, "errors": errors}