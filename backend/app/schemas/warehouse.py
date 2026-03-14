from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── Warehouse ───────────────────────────────────────────────────────
class WarehouseCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    short_code: str = Field(..., min_length=2, max_length=10, pattern=r'^[A-Z0-9\-]+$')
    address: Optional[str] = Field(None, max_length=255)


class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    short_code: Optional[str] = None
    address: Optional[str] = None


class LocationResponse(BaseModel):
    id: int
    name: str
    short_code: str
    warehouse_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class WarehouseResponse(BaseModel):
    id: int
    name: str
    short_code: str
    address: Optional[str]
    created_at: datetime
    locations: List[LocationResponse] = []

    class Config:
        from_attributes = True


# ─── Location ────────────────────────────────────────────────────────
class LocationCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    short_code: str = Field(..., min_length=2, max_length=10, pattern=r'^[A-Z0-9\-]+$')
    warehouse_id: int = Field(..., gt=0)


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    short_code: Optional[str] = None
