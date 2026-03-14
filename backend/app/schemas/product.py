from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ─── Category ────────────────────────────────────────────────────────
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Product ─────────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    name: str
    sku: str
    category_id: Optional[int] = None
    unit_of_measure: str = "Unit"
    low_stock_threshold: int = 10
    initial_stock: int = 0
    location_id: Optional[int] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category_id: Optional[int] = None
    unit_of_measure: Optional[str] = None
    low_stock_threshold: Optional[int] = None


class StockByLocation(BaseModel):
    location_id: int
    location_name: str
    warehouse_name: str
    quantity: int

    class Config:
        from_attributes = True


class ProductResponse(BaseModel):
    id: int
    name: str
    sku: str
    category_id: Optional[int]
    category: Optional[CategoryResponse] = None
    unit_of_measure: str
    low_stock_threshold: int
    total_stock: int = 0
    stock_by_location: List[StockByLocation] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
