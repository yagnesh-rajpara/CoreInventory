"""initial migration

Revision ID: 001_initial
Revises:
Create Date: 2024-01-01

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("inventory_manager", "warehouse_staff", name="userrole"), nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("otp_code", sa.String(6), nullable=True),
        sa.Column("otp_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    # Product categories
    op.create_table(
        "product_categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), unique=True, nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    # Products
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, index=True),
        sa.Column("sku", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("product_categories.id"), nullable=True),
        sa.Column("unit_of_measure", sa.String(50), default="Unit"),
        sa.Column("low_stock_threshold", sa.Integer(), default=10),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    # Warehouses
    op.create_table(
        "warehouses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("short_code", sa.String(10), unique=True, nullable=False),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    # Locations
    op.create_table(
        "locations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("short_code", sa.String(20), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    # Stock quantities
    op.create_table(
        "stock_quantities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False, index=True),
        sa.Column("location_id", sa.Integer(), sa.ForeignKey("locations.id"), nullable=False, index=True),
        sa.Column("quantity", sa.Integer(), default=0, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("product_id", "location_id", name="uq_stock_product_location"),
    )

    # Receipts
    op.create_table(
        "receipts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("reference", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("supplier_name", sa.String(255), nullable=True),
        sa.Column("status", sa.Enum("draft", "waiting", "ready", "done", "canceled", name="operationstatus"), nullable=False),
        sa.Column("location_id", sa.Integer(), sa.ForeignKey("locations.id"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "receipt_lines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("receipt_id", sa.Integer(), sa.ForeignKey("receipts.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
    )

    # Deliveries
    op.create_table(
        "deliveries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("reference", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("customer_name", sa.String(255), nullable=True),
        sa.Column("status", sa.Enum("draft", "waiting", "ready", "done", "canceled", name="operationstatus", create_type=False), nullable=False),
        sa.Column("location_id", sa.Integer(), sa.ForeignKey("locations.id"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "delivery_lines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("delivery_id", sa.Integer(), sa.ForeignKey("deliveries.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
    )

    # Internal transfers
    op.create_table(
        "internal_transfers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("reference", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("status", sa.Enum("draft", "waiting", "ready", "done", "canceled", name="operationstatus", create_type=False), nullable=False),
        sa.Column("from_location_id", sa.Integer(), sa.ForeignKey("locations.id"), nullable=False),
        sa.Column("to_location_id", sa.Integer(), sa.ForeignKey("locations.id"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "transfer_lines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("transfer_id", sa.Integer(), sa.ForeignKey("internal_transfers.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
    )

    # Stock adjustments
    op.create_table(
        "stock_adjustments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("reference", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("location_id", sa.Integer(), sa.ForeignKey("locations.id"), nullable=False),
        sa.Column("recorded_quantity", sa.Integer(), nullable=False),
        sa.Column("actual_quantity", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    # Stock moves (ledger)
    op.create_table(
        "stock_moves",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False, index=True),
        sa.Column("from_location_id", sa.Integer(), sa.ForeignKey("locations.id"), nullable=True),
        sa.Column("to_location_id", sa.Integer(), sa.ForeignKey("locations.id"), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("move_type", sa.Enum("receipt", "delivery", "transfer_in", "transfer_out", "adjustment", name="movetype"), nullable=False),
        sa.Column("reference", sa.String(100), nullable=False, index=True),
        sa.Column("status", sa.Enum("draft", "waiting", "ready", "done", "canceled", name="operationstatus", create_type=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    op.drop_table("stock_moves")
    op.drop_table("stock_adjustments")
    op.drop_table("transfer_lines")
    op.drop_table("internal_transfers")
    op.drop_table("delivery_lines")
    op.drop_table("deliveries")
    op.drop_table("receipt_lines")
    op.drop_table("receipts")
    op.drop_table("stock_quantities")
    op.drop_table("locations")
    op.drop_table("warehouses")
    op.drop_table("products")
    op.drop_table("product_categories")
    op.drop_table("users")
