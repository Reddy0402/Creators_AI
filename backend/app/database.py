import logging
from collections.abc import Iterator

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

logger = logging.getLogger("creatoros.db")


class Base(DeclarativeBase):
    pass


def make_engine(url: str) -> Engine:
    # Vercel / Neon / Supabase URLs usually start with postgres:// or postgresql://
    # SQLAlchemy 2.0 with psycopg 3 requires postgresql+psycopg://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)

    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    if url.startswith("sqlite:///"):
        db_path_str = url[len("sqlite:///"):]
        if db_path_str and db_path_str != ":memory:":
            from pathlib import Path
            Path(db_path_str).parent.mkdir(parents=True, exist_ok=True)

    # Serverless (like Vercel) benefits from NullPool or pool_pre_ping
    engine_kwargs = {"connect_args": connect_args}
    if not url.startswith("sqlite"):
        engine_kwargs["pool_pre_ping"] = True
        # Fail fast on an unreachable database instead of hanging for minutes
        # (e.g. a wrong host, or a firewall that drops the connection silently).
        connect_args["connect_timeout"] = 10

    engine = create_engine(url, **engine_kwargs)

    if url.startswith("sqlite"):
        # SQLite ignores foreign keys unless asked, and cascade deletes rely on them.
        @event.listens_for(engine, "connect")
        def _enable_foreign_keys(dbapi_connection, _record):
            dbapi_connection.execute("PRAGMA foreign_keys=ON")

    return engine


engine = make_engine(get_settings().database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def _public_url(url: str) -> str:
    """The database location with any password masked, safe for logs and error messages."""
    from urllib.parse import urlparse, urlunparse

    parts = urlparse(url)
    host = parts.hostname or ""
    port = f":{parts.port}" if parts.port else ""
    if parts.scheme.startswith("sqlite"):
        return parts.path or ":memory:"
    return urlunparse(
        (parts.scheme, f"***@{host}{port}" if parts.username else f"{host}{port}", parts.path, "", "", "")
    )


def check_connection() -> None:
    """Open one connection and run a trivial query. Raises with an actionable message on failure."""
    target = _public_url(engine.url.render_as_string(hide_password=True))
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        reason = str(exc.__cause__ or exc).split("\n")[0][:200]
        raise RuntimeError(
            f"Could not connect to the database at {target}: {reason} "
            "Check DATABASE_URL in backend/.env (host, port, database name, credentials), "
            "and that PostgreSQL is running and reachable. Restart the backend after fixing it."
        ) from exc
    logger.info("Database connection OK: %s", target)


def _literal_sql(value) -> str:
    """Render a Python scalar as an SQL literal. Doubling single quotes is portable."""
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def _ensure_schema(engine: Engine) -> None:
    """Add model columns that are missing from an existing database table.

    Additive only: never drops or rewrites existing data. New columns receive their
    declared default, so rows created before the column existed keep working.
    """
    from sqlalchemy import inspect, text

    from app import models  # noqa: F401  (registers the models on Base.metadata)

    inspector = inspect(engine)
    present_tables = set(inspector.get_table_names())
    for table in Base.metadata.sorted_tables:
        if table.name not in present_tables:
            continue  # a brand-new table was just created by create_all, fully populated
        existing = {c["name"] for c in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name in existing:
                continue
            type_sql = str(column.type.compile(dialect=engine.dialect))
            sql = f"ALTER TABLE {table.name} ADD COLUMN {column.name} {type_sql}"
            has_default = (
                column.default is not None and column.default.is_scalar and column.default.arg is not None
            )
            if has_default:
                sql += f" DEFAULT {_literal_sql(column.default.arg)}"
            elif not column.nullable:
                # PostgreSQL refuses NOT NULL without a default when rows already exist.
                raise RuntimeError(
                    f"Schema fixup blocked: cannot add NOT NULL column "
                    f"'{table.name}.{column.name}' without a default. "
                    "Resolve the schema drift manually, then restart the backend."
                )
            logger.info("Adding missing column %s.%s to existing database.", table.name, column.name)
            with engine.begin() as conn:
                conn.execute(text(sql))


def init_db() -> None:
    """Verify connectivity, create missing tables, and add missing columns on old databases.

    Additive only: it never drops or rewrites existing data. Safe to call on every startup.
    """
    from app import models  # noqa: F401  (registers the models on Base.metadata)

    check_connection()
    Base.metadata.create_all(bind=engine)
    _ensure_schema(engine)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
