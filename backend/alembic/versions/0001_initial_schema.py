"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-10-26

Creates the three core tables (campaigns, creative_assets, visual_assets) matching
app/models.py, including the campaign status column. This is the initial migration:
run it with `alembic upgrade head` to bring a brand-new database up to date.

On an existing database that was created by the app's create_all startup step, this
migration is a no-op for the tables that already exist (Alembic stamps them); the app's
additive _ensure_schema() covers any per-column drift.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "campaigns",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("product_or_service", sa.String(length=200), nullable=False),
        sa.Column("target_audience", sa.String(length=300), nullable=False),
        sa.Column("objective", sa.String(length=300), nullable=False),
        sa.Column("platform", sa.String(length=40), nullable=False),
        sa.Column("tone", sa.String(length=60), nullable=False),
        sa.Column("brief", sa.Text(), nullable=False),
        sa.Column("strategy", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_campaigns_status", "campaigns", ["status"])

    op.create_table(
        "creative_assets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("campaign_id", sa.Integer(), nullable=False),
        sa.Column("content_type", sa.String(length=40), nullable=False),
        sa.Column("platform", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("source_asset_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_creative_assets_campaign_id", "creative_assets", ["campaign_id"])

    op.create_table(
        "visual_assets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("campaign_id", sa.Integer(), nullable=False),
        sa.Column("asset_type", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=True),
        sa.Column("provider", sa.String(length=40), nullable=True),
        sa.Column("model", sa.String(length=80), nullable=True),
        sa.Column("storage_key", sa.String(length=80), nullable=False),
        sa.Column("mime_type", sa.String(length=40), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key"),
    )
    op.create_index("ix_visual_assets_campaign_id", "visual_assets", ["campaign_id"])


def downgrade() -> None:
    op.drop_index("ix_visual_assets_campaign_id", table_name="visual_assets")
    op.drop_table("visual_assets")
    op.drop_index("ix_creative_assets_campaign_id", table_name="creative_assets")
    op.drop_table("creative_assets")
    op.drop_index("ix_campaigns_status", table_name="campaigns")
    op.drop_table("campaigns")