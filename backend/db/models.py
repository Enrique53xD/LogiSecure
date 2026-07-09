"""ORM models for the on-prem asset/shipment DB. Kept minimal -- just enough for
the local asset correlation step described in the root README; the correlation
logic itself belongs to the AI track."""

from datetime import datetime

from geoalchemy2 import Geography, WKBElement
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from db.session import Base


class Shipment(Base):
    __tablename__ = "shipments"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String, unique=True)
    status: Mapped[str] = mapped_column(String, default="pending")
    origin: Mapped[WKBElement] = mapped_column(Geography(geometry_type="POINT", srid=4326))
    destination: Mapped[WKBElement] = mapped_column(Geography(geometry_type="POINT", srid=4326))
    eta: Mapped[datetime | None] = mapped_column(nullable=True)


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(String)
    current_position: Mapped[WKBElement] = mapped_column(
        Geography(geometry_type="POINT", srid=4326)
    )


class Manifest(Base):
    __tablename__ = "manifests"

    id: Mapped[int] = mapped_column(primary_key=True)
    shipment_id: Mapped[int] = mapped_column(ForeignKey("shipments.id"))
    cargo_description: Mapped[str] = mapped_column(String)
