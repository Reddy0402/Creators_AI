from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    product_or_service: Mapped[str] = mapped_column(String(200))
    target_audience: Mapped[str] = mapped_column(String(300))
    objective: Mapped[str] = mapped_column(String(300))
    platform: Mapped[str] = mapped_column(String(40))
    tone: Mapped[str] = mapped_column(String(60))
    brief: Mapped[str] = mapped_column(Text, default="")
    # Validated StrategyOut, stored as JSON. None until a strategy is generated.
    strategy: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # "draft" | "active" | "completed". Defaults to draft; changed via PATCH.
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    assets: Mapped[list["CreativeAsset"]] = relationship(
        back_populates="campaign",
        cascade="all, delete-orphan",
        order_by="CreativeAsset.created_at.desc()",
    )
    visuals: Mapped[list["VisualAsset"]] = relationship(
        back_populates="campaign",
        cascade="all, delete-orphan",
        order_by="VisualAsset.created_at.desc()",
    )


class CreativeAsset(Base):
    __tablename__ = "creative_assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    campaign_id: Mapped[int] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"), index=True
    )
    content_type: Mapped[str] = mapped_column(String(40))
    platform: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(200))
    # Type-specific structure (social post, ad copy, video script, email).
    content: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    # Set when this asset came from "Explore another version" / refinement.
    source_asset_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    campaign: Mapped[Campaign] = relationship(back_populates="assets")


class VisualAsset(Base):
    """An uploaded or generated image. The file lives on disk; only its key is stored here."""

    __tablename__ = "visual_assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    campaign_id: Mapped[int] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"), index=True
    )
    asset_type: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(200))
    # "upload" or "generated"
    source: Mapped[str] = mapped_column(String(20))
    prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    # Generated file name, e.g. "3f2a...c1.jpg". Never the client's file name.
    storage_key: Mapped[str] = mapped_column(String(80), unique=True)
    mime_type: Mapped[str] = mapped_column(String(40))
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    size_bytes: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    campaign: Mapped[Campaign] = relationship(back_populates="visuals")

    @property
    def url(self) -> str:
        return f"/api/images/{self.id}/file"
