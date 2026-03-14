"""Seed script — populates the database with sample data."""
import sys
import os
import traceback
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models import (
    User, UserRole, ProductCategory, Product, Warehouse, Location,
    StockQuantity, Receipt, ReceiptLine, OperationStatus, StockMove, MoveType
)
from app.core.security import hash_password


def seed():
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).first():
            print("✔ Database already seeded, skipping.")
            db.close()
            return

        print("🌱 Seeding database...")

        # ── Users (add one at a time to avoid insertmanyvalues issue) ──
        admin = User(
            email="admin@coreinventory.com",
            full_name="Admin Manager",
            hashed_password=hash_password("admin123"),
            role=UserRole.INVENTORY_MANAGER,
        )
        db.add(admin)
        db.flush()

        staff = User(
            email="staff@coreinventory.com",
            full_name="Warehouse Staff",
            hashed_password=hash_password("staff123"),
            role=UserRole.WAREHOUSE_STAFF,
        )
        db.add(staff)
        db.flush()

        # ── Categories ─────────────────────────────────────────────────
        cats = {}
        for name in ["Raw Materials", "Finished Goods", "Packaging", "Electronics", "Office Supplies"]:
            c = ProductCategory(name=name, description=f"{name} category")
            db.add(c)
            db.flush()
            cats[name] = c

        # ── Warehouses (add one at a time) ─────────────────────────────
        wh_main = Warehouse(name="Main Warehouse", short_code="WH-MAIN", address="123 Industrial Blvd, City")
        db.add(wh_main)
        db.flush()

        wh_east = Warehouse(name="East Distribution Center", short_code="WH-EAST", address="456 Commerce St, Town")
        db.add(wh_east)
        db.flush()

        locations = {}
        loc_data = [
            ("Rack A", "RA", wh_main.id),
            ("Rack B", "RB", wh_main.id),
            ("Cold Storage", "CS", wh_main.id),
            ("Staging Area", "SA", wh_east.id),
            ("Loading Dock", "LD", wh_east.id),
        ]
        for name, code, wh_id in loc_data:
            loc = Location(name=name, short_code=code, warehouse_id=wh_id)
            db.add(loc)
            db.flush()
            locations[name] = loc

        # ── Products ───────────────────────────────────────────────────
        products_data = [
            ("Steel Rods", "STL-001", cats["Raw Materials"].id, "Pack", 20),
            ("Aluminum Sheets", "ALM-002", cats["Raw Materials"].id, "Sheet", 15),
            ("Copper Wire", "CPR-003", cats["Raw Materials"].id, "Meter", 50),
            ("Office Chair", "CHR-004", cats["Finished Goods"].id, "Unit", 10),
            ("Standing Desk", "DSK-005", cats["Finished Goods"].id, "Unit", 5),
            ("Cardboard Box (Large)", "BOX-006", cats["Packaging"].id, "Unit", 100),
            ("Bubble Wrap Roll", "BWR-007", cats["Packaging"].id, "Roll", 30),
            ("Arduino Board", "ARD-008", cats["Electronics"].id, "Unit", 25),
            ("Raspberry Pi 5", "RPI-009", cats["Electronics"].id, "Unit", 15),
            ("USB-C Cable", "USB-010", cats["Electronics"].id, "Unit", 50),
            ("A4 Paper Ream", "PPR-011", cats["Office Supplies"].id, "Ream", 20),
            ("Whiteboard Marker Set", "MRK-012", cats["Office Supplies"].id, "Set", 30),
        ]
        products = {}
        for name, sku, cat_id, uom, threshold in products_data:
            p = Product(name=name, sku=sku, category_id=cat_id, unit_of_measure=uom, low_stock_threshold=threshold)
            db.add(p)
            db.flush()
            products[sku] = p

        # ── Initial Stock (add one at a time) ──────────────────────────
        stock_entries = [
            (products["STL-001"].id, locations["Rack A"].id, 150),
            (products["ALM-002"].id, locations["Rack A"].id, 80),
            (products["CPR-003"].id, locations["Rack B"].id, 200),
            (products["CHR-004"].id, locations["Staging Area"].id, 45),
            (products["DSK-005"].id, locations["Staging Area"].id, 12),
            (products["BOX-006"].id, locations["Cold Storage"].id, 500),
            (products["BWR-007"].id, locations["Cold Storage"].id, 25),
            (products["ARD-008"].id, locations["Rack B"].id, 60),
            (products["RPI-009"].id, locations["Rack B"].id, 8),
            (products["USB-010"].id, locations["Loading Dock"].id, 120),
            (products["PPR-011"].id, locations["Staging Area"].id, 0),
            (products["MRK-012"].id, locations["Staging Area"].id, 15),
        ]
        for pid, lid, qty in stock_entries:
            db.add(StockQuantity(product_id=pid, location_id=lid, quantity=qty))
            if qty > 0:
                sku = db.query(Product.sku).filter_by(id=pid).scalar()
                db.add(StockMove(
                    product_id=pid, to_location_id=lid, quantity=qty,
                    move_type=MoveType.ADJUSTMENT, reference=f"INIT-{sku}",
                    status=OperationStatus.DONE
                ))
            db.flush()

        # ── Sample Receipt (draft) ─────────────────────────────────────
        r = Receipt(
            reference="RCV-SEED0001", supplier_name="Acme Metals Inc.",
            status=OperationStatus.DRAFT, location_id=locations["Rack A"].id,
            notes="Monthly steel delivery", created_by=admin.id,
        )
        db.add(r)
        db.flush()

        db.add(ReceiptLine(receipt_id=r.id, product_id=products["STL-001"].id, quantity=50))
        db.flush()
        db.add(ReceiptLine(receipt_id=r.id, product_id=products["ALM-002"].id, quantity=30))
        db.flush()

        db.commit()
        print("✅ Seeding complete!")

    except Exception as e:
        db.rollback()
        print(f"⚠️ Seeding error (non-fatal): {e}")
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
