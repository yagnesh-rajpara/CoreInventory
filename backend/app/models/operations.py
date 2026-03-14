from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum as SAEnum, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.database import Base


class OperationStatus(str, enum.Enum):
    DRAFT = "draft"
    WAITING = "waiting"
    READY = "ready"
    DONE = "done"
    CANCELED = "canceled"


# ─── Receipts ────────────────────────────────────────────────────────
class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(100), unique=True, nullable=False, index=True)
    supplier_name = Column(String(255), nullable=True)
    status = Column(SAEnum(OperationStatus, values_callable=lambda x: [e.value for e in x]), default=OperationStatus.DRAFT, nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    validated_at = Column(DateTime(timezone=True), nullable=True)

    location = relationship("Location")
    creator = relationship("User")
    lines = relationship("ReceiptLine", back_populates="receipt", cascade="all, delete-orphan")


class ReceiptLine(Base):
    __tablename__ = "receipt_lines"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)

    receipt = relationship("Receipt", back_populates="lines")
    product = relationship("Product")


# ─── Deliveries ──────────────────────────────────────────────────────
class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(100), unique=True, nullable=False, index=True)
    customer_name = Column(String(255), nullable=True)
    status = Column(SAEnum(OperationStatus, values_callable=lambda x: [e.value for e in x]), default=OperationStatus.DRAFT, nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    validated_at = Column(DateTime(timezone=True), nullable=True)

    location = relationship("Location")
    creator = relationship("User")
    lines = relationship("DeliveryLine", back_populates="delivery", cascade="all, delete-orphan")


class DeliveryLine(Base):
    __tablename__ = "delivery_lines"

    id = Column(Integer, primary_key=True, index=True)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)

    delivery = relationship("Delivery", back_populates="lines")
    product = relationship("Product")


# ─── Internal Transfers ─────────────────────────────────────────────
class InternalTransfer(Base):
    __tablename__ = "internal_transfers"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(100), unique=True, nullable=False, index=True)
    status = Column(SAEnum(OperationStatus, values_callable=lambda x: [e.value for e in x]), default=OperationStatus.DRAFT, nullable=False)
    from_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    to_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    validated_at = Column(DateTime(timezone=True), nullable=True)

    from_location = relationship("Location", foreign_keys=[from_location_id])
    to_location = relationship("Location", foreign_keys=[to_location_id])
    creator = relationship("User")
    lines = relationship("TransferLine", back_populates="transfer", cascade="all, delete-orphan")


class TransferLine(Base):
    __tablename__ = "transfer_lines"

    id = Column(Integer, primary_key=True, index=True)
    transfer_id = Column(Integer, ForeignKey("internal_transfers.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)

    transfer = relationship("InternalTransfer", back_populates="lines")
    product = relationship("Product")


# ─── Stock Adjustments ───────────────────────────────────────────────
class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(100), unique=True, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    recorded_quantity = Column(Integer, nullable=False)
    actual_quantity = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    product = relationship("Product")
    location = relationship("Location")
    creator = relationship("User")


# ─── Stock Moves (Ledger) ───────────────────────────────────────────
class MoveType(str, enum.Enum):
    RECEIPT = "receipt"
    DELIVERY = "delivery"
    TRANSFER_IN = "transfer_in"
    TRANSFER_OUT = "transfer_out"
    ADJUSTMENT = "adjustment"


class StockMove(Base):
    __tablename__ = "stock_moves"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    from_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    to_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    move_type = Column(SAEnum(MoveType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    reference = Column(String(100), nullable=False, index=True)
    status = Column(SAEnum(OperationStatus, values_callable=lambda x: [e.value for e in x]), default=OperationStatus.DONE, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    product = relationship("Product")
    from_location = relationship("Location", foreign_keys=[from_location_id])
    to_location = relationship("Location", foreign_keys=[to_location_id])
