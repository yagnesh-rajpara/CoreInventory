from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    Product, StockQuantity, Receipt, Delivery, InternalTransfer,
    StockMove, OperationStatus, Location,
)
from app.schemas.dashboard import DashboardResponse, KPIResponse, RecentActivityItem

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    total_products = db.query(Product).count()

    # Aggregate total stock per product
    stock_agg = (
        db.query(StockQuantity.product_id, func.sum(StockQuantity.quantity).label("total"))
        .group_by(StockQuantity.product_id).all()
    )
    stock_map = {row.product_id: row.total for row in stock_agg}

    low_stock = 0
    out_of_stock = 0
    for product in db.query(Product).all():
        total = stock_map.get(product.id, 0)
        if total == 0:
            out_of_stock += 1
        elif total <= product.low_stock_threshold:
            low_stock += 1

    pending_receipts = db.query(Receipt).filter(Receipt.status.in_([
        OperationStatus.DRAFT, OperationStatus.WAITING, OperationStatus.READY
    ])).count()

    pending_deliveries = db.query(Delivery).filter(Delivery.status.in_([
        OperationStatus.DRAFT, OperationStatus.WAITING, OperationStatus.READY
    ])).count()

    internal_transfers = db.query(InternalTransfer).filter(InternalTransfer.status.in_([
        OperationStatus.DRAFT, OperationStatus.WAITING, OperationStatus.READY
    ])).count()

    kpis = KPIResponse(
        total_products=total_products,
        low_stock_items=low_stock,
        out_of_stock_items=out_of_stock,
        pending_receipts=pending_receipts,
        pending_deliveries=pending_deliveries,
        internal_transfers=internal_transfers,
    )

    # Recent activity from stock moves
    recent_moves = db.query(StockMove).order_by(StockMove.created_at.desc()).limit(10).all()
    recent_activity = []
    for move in recent_moves:
        product = db.query(Product).filter_by(id=move.product_id).first()
        desc = f"{move.move_type.value.replace('_', ' ').title()}: {product.name if product else 'Unknown'} x {move.quantity}"
        recent_activity.append(RecentActivityItem(
            id=move.id,
            type=move.move_type.value,
            reference=move.reference,
            status=move.status.value if move.status else "done",
            description=desc,
            created_at=move.created_at,
        ))

    return DashboardResponse(kpis=kpis, recent_activity=recent_activity)
