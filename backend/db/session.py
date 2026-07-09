"""Engine/session setup for the on-prem Postgres+PostGIS database. `init_db()`
is called from the FastAPI lifespan and never raises -- an unreachable DB is
logged and the app keeps running (mocks/live sources don't depend on it)."""

import logging

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from config import settings

logger = logging.getLogger(__name__)

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    try:
        import db.models  # noqa: F401  (registers models on Base.metadata)

        Base.metadata.create_all(bind=engine)
    except Exception:
        logger.warning("init_db: database unreachable, continuing without it", exc_info=True)
