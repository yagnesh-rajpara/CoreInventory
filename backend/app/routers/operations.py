from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
import uuid

from app.database import get_db
from app.models import (
    Receipt, ReceiptLine, Delivery, DeliveryLine,
    InternalTransfer, TransferLine, StockAdjustment,
    OperationStatus, Product, Location,
)
from app.schemas.operations import (
    ReceiptCreate, ReceiptResponse, DeliveryCreate, DeliveryResponse,
    TransferCreate, TransferResponse, AdjustmentCreate, AdjustmentResponse,
)
from app.core.security import get_current_user
from app.core.exceptions import NotFoundException, BadRequestException
from app.services.operations_service import (
    validate_receipt, validate_delivery, validate_transfer, apply_adjustment,
)

router = APIRouter(prefix="/api/operations", tags=["Operations"])


def _gen_ref(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


def _receipt_to_response(r: Receipt, db: Session) -> dict:
    loc = db.query(Location).filter_by(id=r.location_id).first()
    return {
        "id": r.id, "reference": r.reference, "supplier_name": r.supplier_name,
        "status": r.status.value if r.status else "draft",
        "location_id": r.location_id, "location_name": loc.name if loc else "",
        "notes": r.notes, "created_by": r.created_by,
        "creator_name": r.creator.full_name if r.creator else "",
        "created_at": r.created_at, "validated_at": r.validated_at,
        "lines": [{"id": l.id, "product_id": l.product_id,
                    "product_name": l.product.name if l.product else "", "quantity": l.quantity}
                   for l in r.lines],
    }


# ─── Receipts ────────────────────────────────────────────────────────
@router.get("/receipts", response_model=list[dict])
def list_receipts(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Receipt)
    if status:
        q = q.filter(Receipt.status == status)
    return [_receipt_to_response(r, db) for r in q.order_by(Receipt.created_at.desc()).all()]


@router.get("/receipts/{rid}")
def get_receipt(rid: int, db: Session = Depends(get_db)):
    r = db.query(Receipt).filter_by(id=rid).first()
    if not r:
        raise NotFoundException("Receipt not found")
    return _receipt_to_response(r, db)


@router.post("/receipts", status_code=201)
def create_receipt(data: ReceiptCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    receipt = Receipt(
        reference=_gen_ref("RCV"), supplier_name=data.supplier_name,
        location_id=data.location_id, notes=data.notes, created_by=user.id,
    )
    db.add(receipt)
    db.flush()
    for line in data.lines:
        db.add(ReceiptLine(receipt_id=receipt.id, product_id=line.product_id, quantity=line.quantity))
    db.commit()
    db.refresh(receipt)
    return _receipt_to_response(receipt, db)


@router.post("/receipts/{rid}/validate")
def validate_receipt_endpoint(rid: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    receipt = validate_receipt(db, rid)
    return _receipt_to_response(receipt, db)


@router.post("/receipts/{rid}/cancel")
def cancel_receipt(rid: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    r = db.query(Receipt).filter_by(id=rid).first()
    if not r:
        raise NotFoundException("Receipt not found")
    if r.status == OperationStatus.DONE:
        raise BadRequestException("Cannot cancel a validated receipt")
    r.status = OperationStatus.CANCELED
    db.commit()
    return _receipt_to_response(r, db)


# ─── Deliveries ──────────────────────────────────────────────────────
def _delivery_to_response(d: Delivery, db: Session) -> dict:
    loc = db.query(Location).filter_by(id=d.location_id).first()
    return {
        "id": d.id, "reference": d.reference, "customer_name": d.customer_name,
        "status": d.status.value if d.status else "draft",
        "location_id": d.location_id, "location_name": loc.name if loc else "",
        "notes": d.notes, "created_by": d.created_by,
        "creator_name": d.creator.full_name if d.creator else "",
        "created_at": d.created_at, "validated_at": d.validated_at,
        "lines": [{"id": l.id, "product_id": l.product_id,
                    "product_name": l.product.name if l.product else "", "quantity": l.quantity}
                   for l in d.lines],
    }


@router.get("/deliveries", response_model=list[dict])
def list_deliveries(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Delivery)
    if status:
        q = q.filter(Delivery.status == status)
    return [_delivery_to_response(d, db) for d in q.order_by(Delivery.created_at.desc()).all()]


@router.get("/deliveries/{did}")
def get_delivery(did: int, db: Session = Depends(get_db)):
    d = db.query(Delivery).filter_by(id=did).first()
    if not d:
        raise NotFoundException("Delivery not found")
    return _delivery_to_response(d, db)


@router.post("/deliveries", status_code=201)
def create_delivery(data: DeliveryCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    delivery = Delivery(
        reference=_gen_ref("DLV"), customer_name=data.customer_name,
        location_id=data.location_id, notes=data.notes, created_by=user.id,
    )
    db.add(delivery)
    db.flush()
    for line in data.lines:
        db.add(DeliveryLine(delivery_id=delivery.id, product_id=line.product_id, quantity=line.quantity))
    db.commit()
    db.refresh(delivery)
    return _delivery_to_response(delivery, db)


@router.post("/deliveries/{did}/validate")
def validate_delivery_endpoint(did: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    delivery = validate_delivery(db, did)
    return _delivery_to_response(delivery, db)


@router.post("/deliveries/{did}/cancel")
def cancel_delivery(did: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    d = db.query(Delivery).filter_by(id=did).first()
    if not d:
        raise NotFoundException("Delivery not found")
    if d.status == OperationStatus.DONE:
        raise BadRequestException("Cannot cancel a validated delivery")
    d.status = OperationStatus.CANCELED
    db.commit()
    return _delivery_to_response(d, db)


# ─── Internal Transfers ─────────────────────────────────────────────
def _transfer_to_response(t: InternalTransfer, db: Session) -> dict:
    fl = db.query(Location).filter_by(id=t.from_location_id).first()
    tl = db.query(Location).filter_by(id=t.to_location_id).first()
    return {
        "id": t.id, "reference": t.reference,
        "status": t.status.value if t.status else "draft",
        "from_location_id": t.from_location_id,
        "from_location_name": fl.name if fl else "",
        "to_location_id": t.to_location_id,
        "to_location_name": tl.name if tl else "",
        "notes": t.notes, "created_by": t.created_by,
        "creator_name": t.creator.full_name if t.creator else "",
        "created_at": t.created_at, "validated_at": t.validated_at,
        "lines": [{"id": l.id, "product_id": l.product_id,
                    "product_name": l.product.name if l.product else "", "quantity": l.quantity}
                   for l in t.lines],
    }


@router.get("/transfers", response_model=list[dict])
def list_transfers(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(InternalTransfer)
    if status:
        q = q.filter(InternalTransfer.status == status)
    return [_transfer_to_response(t, db) for t in q.order_by(InternalTransfer.created_at.desc()).all()]


@router.get("/transfers/{tid}")
def get_transfer(tid: int, db: Session = Depends(get_db)):
    t = db.query(InternalTransfer).filter_by(id=tid).first()
    if not t:
        raise NotFoundException("Transfer not found")
    return _transfer_to_response(t, db)


@router.post("/transfers", status_code=201)
def create_transfer(data: TransferCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if data.from_location_id == data.to_location_id:
        raise BadRequestException("From and To locations must be different")
    transfer = InternalTransfer(
        reference=_gen_ref("TRF"), from_location_id=data.from_location_id,
        to_location_id=data.to_location_id, notes=data.notes, created_by=user.id,
    )
    db.add(transfer)
    db.flush()
    for line in data.lines:
        db.add(TransferLine(transfer_id=transfer.id, product_id=line.product_id, quantity=line.quantity))
    db.commit()
    db.refresh(transfer)
    return _transfer_to_response(transfer, db)


@router.post("/transfers/{tid}/validate")
def validate_transfer_endpoint(tid: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    transfer = validate_transfer(db, tid)
    return _transfer_to_response(transfer, db)


@router.post("/transfers/{tid}/cancel")
def cancel_transfer(tid: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    t = db.query(InternalTransfer).filter_by(id=tid).first()
    if not t:
        raise NotFoundException("Transfer not found")
    if t.status == OperationStatus.DONE:
        raise BadRequestException("Cannot cancel a validated transfer")
    t.status = OperationStatus.CANCELED
    db.commit()
    return _transfer_to_response(t, db)


# ─── Stock Adjustments ──────────────────────────────────────────────
@router.get("/adjustments", response_model=list[dict])
def list_adjustments(db: Session = Depends(get_db)):
    adjs = db.query(StockAdjustment).order_by(StockAdjustment.created_at.desc()).all()
    results = []
    for a in adjs:
        loc = db.query(Location).filter_by(id=a.location_id).first()
        results.append({
            "id": a.id, "reference": a.reference,
            "product_id": a.product_id, "product_name": a.product.name if a.product else "",
            "location_id": a.location_id, "location_name": loc.name if loc else "",
            "recorded_quantity": a.recorded_quantity, "actual_quantity": a.actual_quantity,
            "notes": a.notes, "created_by": a.created_by,
            "creator_name": a.creator.full_name if a.creator else "",
            "created_at": a.created_at,
        })
    return results


@router.post("/adjustments", status_code=201)
def create_adjustment(data: AdjustmentCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    adj = StockAdjustment(
        reference=_gen_ref("ADJ"), product_id=data.product_id,
        location_id=data.location_id, recorded_quantity=data.recorded_quantity,
        actual_quantity=data.actual_quantity, notes=data.notes, created_by=user.id,
    )
    db.add(adj)
    db.flush()
    apply_adjustment(db, adj)
    db.commit()
    db.refresh(adj)
    loc = db.query(Location).filter_by(id=adj.location_id).first()
    return {
        "id": adj.id, "reference": adj.reference,
        "product_id": adj.product_id, "product_name": adj.product.name if adj.product else "",
        "location_id": adj.location_id, "location_name": loc.name if loc else "",
        "recorded_quantity": adj.recorded_quantity, "actual_quantity": adj.actual_quantity,
        "notes": adj.notes, "created_by": adj.created_by,
        "creator_name": adj.creator.full_name if adj.creator else "",
        "created_at": adj.created_at,
    }
