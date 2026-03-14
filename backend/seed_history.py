from app.database import SessionLocal
from app.models import StockMove, Product, MoveType, OperationStatus, Location
from datetime import datetime, timedelta, timezone
import random

def seed_history():
    db = SessionLocal()
    try:
        products = db.query(Product).all()
        locations = db.query(Location).all()
        if not products or not locations:
            print("No products or locations found. Seed them first.")
            return

        print("🌱 Seeding historical moves...")
        now = datetime.now(timezone.utc)
        
        # Create moves for the last 14 days
        for i in range(1, 15):
            day = now - timedelta(days=i)
            # 2-5 moves per day
            for _ in range(random.randint(2, 5)):
                p = random.choice(products)
                move_type = random.choice([MoveType.RECEIPT, MoveType.DELIVERY, MoveType.TRANSFER_OUT])
                qty = random.randint(5, 50)
                
                from_loc = None
                to_loc = None
                
                if move_type == MoveType.RECEIPT:
                    to_loc = random.choice(locations).id
                elif move_type == MoveType.DELIVERY:
                    from_loc = random.choice(locations).id
                else: # Transfer
                    from_loc = random.choice(locations).id
                    to_loc = random.choice([l for l in locations if l.id != from_loc]).id

                move = StockMove(
                    product_id=p.id,
                    from_location_id=from_loc,
                    to_location_id=to_loc,
                    quantity=qty,
                    move_type=move_type,
                    reference=f"HIST-{day.strftime('%Y%m%d')}-{random.randint(100,999)}",
                    status=OperationStatus.DONE,
                    created_at=day
                )
                db.add(move)
        
        db.commit()
        print("✅ Historical seeding complete!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_history()
