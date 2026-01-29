# ====================== Models ================================ #
from datetime import datetime
from sqlalchemy import Float, DateTime, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import declarative_base, Mapped, mapped_column

Base = declarative_base()


class Station(Base):
    __tablename__ = "stations"
    
    station_id: Mapped[int] = mapped_column(primary_key=True)
    notation: Mapped[str] = mapped_column(String(50), unique=True)
    label: Mapped[str] = mapped_column(String(255), unique=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    long: Mapped[float | None] = mapped_column(Float, nullable=True)
    qualifier: Mapped[str] = mapped_column(String(100), unique=True)
    unitname: Mapped[str] = mapped_column(String(100), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False))


class Reading(Base):
    __tablename__ = "readings"
    
    station_id: Mapped[int] = mapped_column(ForeignKey("stations.station_id", ondelete="CASCADE"), primary_key=True)
    date_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    value: Mapped[float] = mapped_column(Float)
    unit_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notation: Mapped[str] = mapped_column(String(50))
    
    __table_args__ = (
        UniqueConstraint('station_id', 'date_time', name='uq_station_datetime'),
    )

# ====================== Models ================================ #
