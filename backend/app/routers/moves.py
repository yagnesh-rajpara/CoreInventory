from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import StockMove, Product, Location

router = APIRouter(prefix="/api/moves", tags=["Stock Moves"])


@router.get("", response_model=dict)
def list_moves(
    search: Optional[str] = Query(None),
    move_type: Optional[str] = Query(None),
    product_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    q = db.query(StockMove)
    if move_type:
        q = q.filter(StockMove.move_type == move_type)
    if product_id:
        q = q.filter(StockMove.product_id == product_id)
    if search:
        q = q.filter(StockMove.reference.ilike(f"%{search}%"))

    total = q.count()
    moves = q.order_by(StockMove.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    items = []
    for m in moves:
        product = db.query(Product).filter_by(id=m.product_id).first()
        fl = db.query(Location).filter_by(id=m.from_location_id).first() if m.from_location_id else None
        tl = db.query(Location).filter_by(id=m.to_location_id).first() if m.to_location_id else None
        items.append({
            "id": m.id,
            "product_id": m.product_id,
            "product_name": product.name if product else "",
            "from_location_id": m.from_location_id,
            "from_location_name": fl.name if fl else "-",
            "to_location_id": m.to_location_id,
            "to_location_name": tl.name if tl else "-",
            "quantity": m.quantity,
            "move_type": m.move_type.value if m.move_type else "",
            "reference": m.reference,
            "status": m.status.value if m.status else "",
            "created_at": m.created_at,
        })
    return {"total": total, "items": items}
