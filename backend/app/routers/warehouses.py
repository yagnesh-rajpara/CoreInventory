from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Warehouse, Location
from app.schemas.warehouse import (
    WarehouseCreate, WarehouseUpdate, WarehouseResponse,
    LocationCreate, LocationUpdate, LocationResponse,
)
from app.core.security import get_current_user
from app.core.exceptions import NotFoundException, ConflictException

router = APIRouter(prefix="/api/warehouses", tags=["Warehouses"])


# ─── Warehouses ──────────────────────────────────────────────────────
@router.get("", response_model=list[WarehouseResponse])
def list_warehouses(db: Session = Depends(get_db)):
    return db.query(Warehouse).options(joinedload(Warehouse.locations)).all()


@router.get("/{wh_id}", response_model=WarehouseResponse)
def get_warehouse(wh_id: int, db: Session = Depends(get_db)):
    wh = db.query(Warehouse).options(joinedload(Warehouse.locations)).filter_by(id=wh_id).first()
    if not wh:
        raise NotFoundException("Warehouse not found")
    return wh


@router.post("", response_model=WarehouseResponse, status_code=201)
def create_warehouse(data: WarehouseCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    existing = db.query(Warehouse).filter_by(short_code=data.short_code).first()
    if existing:
        raise ConflictException("Short code already exists")
    wh = Warehouse(**data.model_dump())
    db.add(wh)
    db.commit()
    db.refresh(wh)
    return wh


@router.put("/{wh_id}", response_model=WarehouseResponse)
def update_warehouse(wh_id: int, data: WarehouseUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    wh = db.query(Warehouse).filter_by(id=wh_id).first()
    if not wh:
        raise NotFoundException("Warehouse not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(wh, key, val)
    db.commit()
    db.refresh(wh)
    return wh


@router.delete("/{wh_id}", status_code=204)
def delete_warehouse(wh_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    wh = db.query(Warehouse).filter_by(id=wh_id).first()
    if not wh:
        raise NotFoundException("Warehouse not found")
    db.delete(wh)
    db.commit()


# ─── Locations ───────────────────────────────────────────────────────
@router.get("/{wh_id}/locations", response_model=list[LocationResponse])
def list_locations(wh_id: int, db: Session = Depends(get_db)):
    return db.query(Location).filter_by(warehouse_id=wh_id).all()


@router.post("/locations", response_model=LocationResponse, status_code=201)
def create_location(data: LocationCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    wh = db.query(Warehouse).filter_by(id=data.warehouse_id).first()
    if not wh:
        raise NotFoundException("Warehouse not found")
    loc = Location(**data.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.put("/locations/{loc_id}", response_model=LocationResponse)
def update_location(loc_id: int, data: LocationUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    loc = db.query(Location).filter_by(id=loc_id).first()
    if not loc:
        raise NotFoundException("Location not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(loc, key, val)
    db.commit()
    db.refresh(loc)
    return loc


@router.delete("/locations/{loc_id}", status_code=204)
def delete_location(loc_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    loc = db.query(Location).filter_by(id=loc_id).first()
    if not loc:
        raise NotFoundException("Location not found")
    db.delete(loc)
    db.commit()


@router.get("/locations/all", response_model=list[LocationResponse])
def list_all_locations(db: Session = Depends(get_db)):
    return db.query(Location).all()
