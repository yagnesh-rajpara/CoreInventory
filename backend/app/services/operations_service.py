from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.models import (
    StockQuantity, StockMove, Receipt, ReceiptLine, Delivery, DeliveryLine,
    InternalTransfer, TransferLine, StockAdjustment,
    OperationStatus, MoveType,
)
from app.core.exceptions import BadRequestException, InsufficientStockException, NotFoundException
import uuid


def _gen_ref(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


# ─── Stock helpers ───────────────────────────────────────────────────
def get_or_create_stock(db: Session, product_id: int, location_id: int) -> StockQuantity:
    sq = db.query(StockQuantity).filter_by(product_id=product_id, location_id=location_id).first()
    if not sq:
        sq = StockQuantity(product_id=product_id, location_id=location_id, quantity=0)
        db.add(sq)
        db.flush()
    return sq


def increase_stock(db: Session, product_id: int, location_id: int, quantity: int):
    sq = get_or_create_stock(db, product_id, location_id)
    sq.quantity += quantity


def decrease_stock(db: Session, product_id: int, location_id: int, quantity: int, product_name: str = "Product"):
    sq = get_or_create_stock(db, product_id, location_id)
    if sq.quantity < quantity:
        raise InsufficientStockException(product_name)
    sq.quantity -= quantity


def create_stock_move(db: Session, product_id: int, from_loc: int | None, to_loc: int | None,
                      quantity: int, move_type: MoveType, reference: str):
    move = StockMove(
        product_id=product_id,
        from_location_id=from_loc,
        to_location_id=to_loc,
        quantity=quantity,
        move_type=move_type,
        reference=reference,
        status=OperationStatus.DONE,
    )
    db.add(move)


# ─── Receipt validation ─────────────────────────────────────────────
def validate_receipt(db: Session, receipt_id: int):
    receipt = db.query(Receipt).filter_by(id=receipt_id).first()
    if not receipt:
        raise NotFoundException("Receipt not found")
    if receipt.status == OperationStatus.DONE:
        raise BadRequestException("Receipt already validated")
    if receipt.status == OperationStatus.CANCELED:
        raise BadRequestException("Cannot validate a canceled receipt")
    if not receipt.lines:
        raise BadRequestException("Receipt has no lines")

    for line in receipt.lines:
        increase_stock(db, line.product_id, receipt.location_id, line.quantity)
        create_stock_move(db, line.product_id, None, receipt.location_id,
                          line.quantity, MoveType.RECEIPT, receipt.reference)

    receipt.status = OperationStatus.DONE
    receipt.validated_at = datetime.now(timezone.utc)
    db.commit()
    return receipt


# ─── Delivery validation ────────────────────────────────────────────
def validate_delivery(db: Session, delivery_id: int):
    delivery = db.query(Delivery).filter_by(id=delivery_id).first()
    if not delivery:
        raise NotFoundException("Delivery not found")
    if delivery.status == OperationStatus.DONE:
        raise BadRequestException("Delivery already validated")
    if delivery.status == OperationStatus.CANCELED:
        raise BadRequestException("Cannot validate a canceled delivery")
    if not delivery.lines:
        raise BadRequestException("Delivery has no lines")

    for line in delivery.lines:
        product_name = line.product.name if line.product else "Product"
        decrease_stock(db, line.product_id, delivery.location_id, line.quantity, product_name)
        create_stock_move(db, line.product_id, delivery.location_id, None,
                          line.quantity, MoveType.DELIVERY, delivery.reference)

    delivery.status = OperationStatus.DONE
    delivery.validated_at = datetime.now(timezone.utc)
    db.commit()
    return delivery


# ─── Transfer validation ────────────────────────────────────────────
def validate_transfer(db: Session, transfer_id: int):
    transfer = db.query(InternalTransfer).filter_by(id=transfer_id).first()
    if not transfer:
        raise NotFoundException("Transfer not found")
    if transfer.status == OperationStatus.DONE:
        raise BadRequestException("Transfer already validated")
    if transfer.status == OperationStatus.CANCELED:
        raise BadRequestException("Cannot validate a canceled transfer")
    if not transfer.lines:
        raise BadRequestException("Transfer has no lines")

    for line in transfer.lines:
        product_name = line.product.name if line.product else "Product"
        decrease_stock(db, line.product_id, transfer.from_location_id, line.quantity, product_name)
        increase_stock(db, line.product_id, transfer.to_location_id, line.quantity)
        create_stock_move(db, line.product_id, transfer.from_location_id, transfer.to_location_id,
                          line.quantity, MoveType.TRANSFER_OUT, transfer.reference)

    transfer.status = OperationStatus.DONE
    transfer.validated_at = datetime.now(timezone.utc)
    db.commit()
    return transfer


# ─── Adjustment ──────────────────────────────────────────────────────
def apply_adjustment(db: Session, adj: StockAdjustment):
    diff = adj.actual_quantity - adj.recorded_quantity
    if diff == 0:
        return
    sq = get_or_create_stock(db, adj.product_id, adj.location_id)
    sq.quantity = adj.actual_quantity
    move_type = MoveType.ADJUSTMENT
    create_stock_move(db, adj.product_id, adj.location_id if diff < 0 else None,
                      adj.location_id if diff > 0 else None,
                      abs(diff), move_type, adj.reference)
