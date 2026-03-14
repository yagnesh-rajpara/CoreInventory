from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional

from app.database import get_db
from app.models import Product, ProductCategory, StockQuantity, Location, Warehouse
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse,
    CategoryCreate, CategoryResponse, StockByLocation,
)
from app.core.security import get_current_user
from app.core.exceptions import NotFoundException, ConflictException
from app.services.operations_service import get_or_create_stock

router = APIRouter(prefix="/api/products", tags=["Products"])


def _build_product_response(product: Product, db: Session) -> dict:
    stocks = db.query(StockQuantity).filter_by(product_id=product.id).all()
    total_stock = sum(s.quantity for s in stocks)
    stock_by_location = []
    for s in stocks:
        loc = db.query(Location).filter_by(id=s.location_id).first()
        wh = db.query(Warehouse).filter_by(id=loc.warehouse_id).first() if loc else None
        stock_by_location.append(StockByLocation(
            location_id=s.location_id,
            location_name=loc.name if loc else "",
            warehouse_name=wh.name if wh else "",
            quantity=s.quantity,
        ))
    cat = None
    if product.category:
        cat = CategoryResponse.model_validate(product.category)
    return {
        **ProductResponse.model_validate(product).model_dump(),
        "category": cat,
        "total_stock": total_stock,
        "stock_by_location": stock_by_location,
    }


@router.get("/categories", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return db.query(ProductCategory).all()


@router.post("/categories", response_model=CategoryResponse, status_code=201)
def create_category(data: CategoryCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    existing = db.query(ProductCategory).filter_by(name=data.name).first()
    if existing:
        raise ConflictException("Category already exists")
    cat = ProductCategory(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.get("", response_model=list[dict])
def list_products(
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    low_stock: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Product).options(joinedload(Product.category))
    if search:
        q = q.filter(Product.name.ilike(f"%{search}%") | Product.sku.ilike(f"%{search}%"))
    if category_id:
        q = q.filter_by(category_id=category_id)
    products = q.order_by(Product.name).all()
    results = []
    for p in products:
        data = _build_product_response(p, db)
        if low_stock and data["total_stock"] >= p.low_stock_threshold:
            continue
        results.append(data)
    return results


@router.get("/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).options(joinedload(Product.category)).filter_by(id=product_id).first()
    if not product:
        raise NotFoundException("Product not found")
    return _build_product_response(product, db)


@router.post("", status_code=201)
def create_product(data: ProductCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    existing = db.query(Product).filter_by(sku=data.sku).first()
    if existing:
        raise ConflictException("SKU already exists")
    product = Product(
        name=data.name, sku=data.sku, category_id=data.category_id,
        unit_of_measure=data.unit_of_measure, low_stock_threshold=data.low_stock_threshold,
    )
    db.add(product)
    db.flush()
    if data.initial_stock > 0 and data.location_id:
        sq = get_or_create_stock(db, product.id, data.location_id)
        sq.quantity = data.initial_stock
    db.commit()
    db.refresh(product)
    return _build_product_response(product, db)


@router.put("/{product_id}")
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    product = db.query(Product).filter_by(id=product_id).first()
    if not product:
        raise NotFoundException("Product not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(product, key, val)
    db.commit()
    db.refresh(product)
    return _build_product_response(product, db)


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    product = db.query(Product).filter_by(id=product_id).first()
    if not product:
        raise NotFoundException("Product not found")
    db.delete(product)
    db.commit()
