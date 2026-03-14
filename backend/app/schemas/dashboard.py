from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class KPIResponse(BaseModel):
    total_products: int = 0
    low_stock_items: int = 0
    out_of_stock_items: int = 0
    pending_receipts: int = 0
    pending_deliveries: int = 0
    internal_transfers: int = 0


class RecentActivityItem(BaseModel):
    id: int
    type: str
    reference: str
    status: str
    description: str
    created_at: datetime


class DashboardResponse(BaseModel):
    kpis: KPIResponse
    recent_activity: List[RecentActivityItem] = []
