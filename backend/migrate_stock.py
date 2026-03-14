from app.database import SessionLocal
from app.models import StockQuantity, StockMove, Product, MoveType, OperationStatus

def migrate():
    db = SessionLocal()
    try:
        quantities = db.query(StockQuantity).all()
        for sq in quantities:
            if sq.quantity > 0:
                # Check if INIT move already exists to avoid duplicates
                sku = db.query(Product.sku).filter_by(id=sq.product_id).scalar()
                ref = f"INIT-{sku}"
                exists = db.query(StockMove).filter_by(product_id=sq.product_id, reference=ref).first()
                if not exists:
                    print(f"Creating init move for {sku}: {sq.quantity}")
                    move = StockMove(
                        product_id=sq.product_id,
                        to_location_id=sq.location_id,
                        quantity=sq.quantity,
                        move_type=MoveType.ADJUSTMENT,
                        reference=ref,
                        status=OperationStatus.DONE
                    )
                    db.add(move)
        db.commit()
        print("✅ Migration complete!")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
