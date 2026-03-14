from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ─── Receipt ─────────────────────────────────────────────────────────
class ReceiptLineCreate(BaseModel):
    product_id: int
    quantity: int


class ReceiptCreate(BaseModel):
    supplier_name: Optional[str] = None
    location_id: int
    notes: Optional[str] = None
    lines: List[ReceiptLineCreate] = []


class ReceiptLineResponse(BaseModel):
    id: int
    product_id: int
    product_name: str = ""
    quantity: int

    class Config:
        from_attributes = True


class ReceiptResponse(BaseModel):
    id: int
    reference: str
    supplier_name: Optional[str]
    status: str
    location_id: int
    location_name: str = ""
    notes: Optional[str]
    created_by: int
    creator_name: str = ""
    created_at: datetime
    validated_at: Optional[datetime]
    lines: List[ReceiptLineResponse] = []

    class Config:
        from_attributes = True


# ─── Delivery ────────────────────────────────────────────────────────
class DeliveryLineCreate(BaseModel):
    product_id: int
    quantity: int


class DeliveryCreate(BaseModel):
    customer_name: Optional[str] = None
    location_id: int
    notes: Optional[str] = None
    lines: List[DeliveryLineCreate] = []


class DeliveryLineResponse(BaseModel):
    id: int
    product_id: int
    product_name: str = ""
    quantity: int

    class Config:
        from_attributes = True


class DeliveryResponse(BaseModel):
    id: int
    reference: str
    customer_name: Optional[str]
    status: str
    location_id: int
    location_name: str = ""
    notes: Optional[str]
    created_by: int
    creator_name: str = ""
    created_at: datetime
    validated_at: Optional[datetime]
    lines: List[DeliveryLineResponse] = []

    class Config:
        from_attributes = True


# ─── Transfer ────────────────────────────────────────────────────────
class TransferLineCreate(BaseModel):
    product_id: int
    quantity: int


class TransferCreate(BaseModel):
    from_location_id: int
    to_location_id: int
    notes: Optional[str] = None
    lines: List[TransferLineCreate] = []


class TransferLineResponse(BaseModel):
    id: int
    product_id: int
    product_name: str = ""
    quantity: int

    class Config:
        from_attributes = True


class TransferResponse(BaseModel):
    id: int
    reference: str
    status: str
    from_location_id: int
    from_location_name: str = ""
    to_location_id: int
    to_location_name: str = ""
    notes: Optional[str]
    created_by: int
    creator_name: str = ""
    created_at: datetime
    validated_at: Optional[datetime]
    lines: List[TransferLineResponse] = []

    class Config:
        from_attributes = True


# ─── Adjustment ──────────────────────────────────────────────────────
class AdjustmentCreate(BaseModel):
    product_id: int
    location_id: int
    recorded_quantity: int
    actual_quantity: int
    notes: Optional[str] = None


class AdjustmentResponse(BaseModel):
    id: int
    reference: str
    product_id: int
    product_name: str = ""
    location_id: int
    location_name: str = ""
    recorded_quantity: int
    actual_quantity: int
    notes: Optional[str]
    created_by: int
    creator_name: str = ""
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Stock Move ──────────────────────────────────────────────────────
class StockMoveResponse(BaseModel):
    id: int
    product_id: int
    product_name: str = ""
    from_location_id: Optional[int]
    from_location_name: str = ""
    to_location_id: Optional[int]
    to_location_name: str = ""
    quantity: int
    move_type: str
    reference: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
