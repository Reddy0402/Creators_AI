"""Live database tests.

These run against the REAL database in DATABASE_URL (not an in-memory test DB), so they
verify the actual driver, JSON columns, time-zone handling and cascade behaviour. They only
touch rows they create and delete them afterwards.

Run them explicitly:
    pytest -m live

They are skipped automatically unless DATABASE_URL points at a PostgreSQL server, so a plain
`pytest` (which selects `-m "not live"`) never needs a live database.
"""

import pytest

from app.config import get_settings
from app.database import SessionLocal, check_connection, engine, init_db
from app.models import Campaign, CreativeAsset

pytestmark = pytest.mark.live

requires_pg = pytest.mark.skipif(
    not get_settings().database_url.startswith("postgres"),
    reason="Set DATABASE_URL to a PostgreSQL connection string (see backend/.env) to run live DB tests.",
)


@requires_pg
def test_crud_persistence_against_real_database():
    # init_db() connects, verifies the server, and creates/fixes the schema.
    init_db()

    # CREATE
    with SessionLocal() as db:
        campaign = Campaign(
            name="Live PG Test",
            product_or_service="Test product",
            target_audience="Test audience",
            objective="Test objective",
            platform="Instagram",
            tone="Calm",
            brief="",
        )
        campaign.assets.append(
            CreativeAsset(content_type="tagline", platform="Instagram", title="t", content={"tagline": "t"})
        )
        db.add(campaign)
        db.commit()
        new_id = campaign.id

    # READ with a brand-new session (simulates a fresh process / restart hitting the same DB).
    with SessionLocal() as db:
        got = db.get(Campaign, new_id)
        assert got is not None and got.name == "Live PG Test"
        assert got.status == "draft"
        assert len(got.assets) == 1
        # UPDATE in place (must not create a duplicate row).
        got.status = "active"
        db.commit()

    # Verify the update persisted and there is still exactly one campaign row.
    with SessionLocal() as db:
        assert db.get(Campaign, new_id).status == "active"
        assert db.query(Campaign).filter_by(name="Live PG Test").count() == 1

    # DELETE cascades to the asset.
    with SessionLocal() as db:
        db.delete(db.get(Campaign, new_id))
        db.commit()

    with SessionLocal() as db:
        assert db.get(Campaign, new_id) is None
        assert not db.query(CreativeAsset).filter_by(campaign_id=new_id).all()


@requires_pg
def test_connection_check_reports_actionable_error_when_unreachable(monkeypatch):
    """A bad host must raise a RuntimeError with an actionable message, not hang or crash opaquely."""
    from app.database import make_engine

    monkeypatch.setattr("app.database.engine", make_engine("postgresql+psycopg://nobody@localhost:9/nothing"))
    with pytest.raises(RuntimeError) as exc:
        check_connection()
    assert "Check DATABASE_URL" in str(exc.value)
    assert "nobody" not in str(exc.value)  # credentials must never leak into the message
    # restore the real engine for any later test
    monkeypatch.setattr("app.database.engine", engine)