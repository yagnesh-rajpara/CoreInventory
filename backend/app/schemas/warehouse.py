from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ─── Warehouse ───────────────────────────────────────────────────────
class WarehouseCreate(BaseModel):
    name: str
    short_code: str
    address: Optional[str] = None


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
    name: str
    short_code: str
    warehouse_id: int


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    short_code: Optional[str] = None
