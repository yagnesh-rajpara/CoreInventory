from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ─── Category ────────────────────────────────────────────────────────
class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=50)
    description: Optional[str] = Field(None, max_length=255)


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Product ─────────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    sku: str = Field(..., pattern=r'^[A-Z0-9\-]+$')
    category_id: Optional[int] = None
    unit_of_measure: str = Field(default="Unit", min_length=1)
    low_stock_threshold: int = Field(default=10, ge=0)
    initial_stock: int = Field(default=0, ge=0)
    location_id: Optional[int] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    sku: Optional[str] = Field(None, pattern=r'^[A-Z0-9\-]+$')
    category_id: Optional[int] = None
    unit_of_measure: Optional[str] = Field(None, min_length=1)
    low_stock_threshold: Optional[int] = Field(None, ge=0)


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
