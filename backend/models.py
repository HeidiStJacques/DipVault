from sqlalchemy import Column, String, DateTime, func, ForeignKey, Boolean, Integer, Numeric, Date, Text, Table
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
import uuid
from database import Base



product_vaults = Table(
    "product_vaults",
    Base.metadata,
    Column("product_id", PG_UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("vault_id", PG_UUID(as_uuid=True), ForeignKey("vaults.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    profile_image_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    vaults = relationship("Vault", back_populates="owner", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="owner", cascade="all, delete-orphan")
    looks = relationship("Look", back_populates="owner", cascade="all, delete-orphan")
    formulas = relationship("Formula", back_populates="owner", cascade="all, delete-orphan")
    tools = relationship("Tool", back_populates="owner", cascade="all, delete-orphan")


class Vault(Base):
    __tablename__ = "vaults"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(String, nullable=True)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="vaults")
    products = relationship("Product", secondary=product_vaults, back_populates="vaults")


class Product(Base):
    __tablename__ = "products"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(200), nullable=False)
    brand = Column(String(100), nullable=True)
    shade_name = Column(String(100), nullable=True)
    type = Column(String(50), nullable=True)
    finish = Column(String(50), nullable=True)
    color_family = Column(String(50), nullable=True)
    collection_name = Column(String(100), nullable=True)
    sku = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    purchase_date = Column(Date, nullable=True)
    purchase_price = Column(Numeric(10, 2), nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    low_stock_threshold = Column(Integer, default=1, nullable=False)

    status = Column(String(50), default="active", nullable=False)
    is_favorite = Column(Boolean, default=False, nullable=False)
    swatched = Column(Boolean, default=False, nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False)

    image_url = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="products")
    vaults = relationship("Vault", secondary=product_vaults, back_populates="products")


class Look(Base):
    __tablename__ = "looks"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    notes = Column(Text, nullable=True)
    is_favorite = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="looks")
    photos = relationship("LookPhoto", back_populates="look", cascade="all, delete-orphan", order_by="LookPhoto.order")
    products = relationship("LookProduct", back_populates="look", cascade="all, delete-orphan")


class LookPhoto(Base):
    __tablename__ = "look_photos"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    look_id = Column(PG_UUID(as_uuid=True), ForeignKey("looks.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String, nullable=False)
    order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    look = relationship("Look", back_populates="photos")


class LookProduct(Base):
    __tablename__ = "look_products"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    look_id = Column(PG_UUID(as_uuid=True), ForeignKey("looks.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(PG_UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    name_override = Column(String(200), nullable=True)

    look = relationship("Look", back_populates="products")
    product = relationship("Product")


class Formula(Base):
    __tablename__ = "formulas"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    notes = Column(Text, nullable=True)
    star_rating = Column(Integer, nullable=True)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="formulas")
    ingredients = relationship("FormulaIngredient", back_populates="formula", cascade="all, delete-orphan", order_by="FormulaIngredient.order")


class FormulaIngredient(Base):
    __tablename__ = "formula_ingredients"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    formula_id = Column(PG_UUID(as_uuid=True), ForeignKey("formulas.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(PG_UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    name_override = Column(String(200), nullable=True)
    measurement = Column(String(100), nullable=True)
    order = Column(Integer, default=0, nullable=False)

    formula = relationship("Formula", back_populates="ingredients")
    product = relationship("Product")


class Tool(Base):
    __tablename__ = "tools"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    type = Column(String(100), nullable=True)
    brand = Column(String(100), nullable=True)
    purchase_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="tools")