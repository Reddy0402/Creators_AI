"""Data must survive a backend restart: a brand-new engine on the same file sees it."""

from sqlalchemy.orm import sessionmaker

from app.database import Base, make_engine
from app.models import Campaign, CreativeAsset
from tests.conftest import CAMPAIGN, SOCIAL, STRATEGY


def test_saved_data_survives_a_new_engine(tmp_path):
    url = f"sqlite:///{(tmp_path / 'restart.db').as_posix()}"

    first = make_engine(url)
    Base.metadata.create_all(first)
    with sessionmaker(bind=first)() as db:
        campaign = Campaign(**CAMPAIGN, strategy=STRATEGY)
        campaign.assets.append(
            CreativeAsset(content_type="social_post", platform="Instagram", title="T", content=SOCIAL)
        )
        db.add(campaign)
        db.commit()
    first.dispose()  # "stop the backend"

    second = make_engine(url)  # "start it again"
    Base.metadata.create_all(second)  # startup is idempotent and keeps existing rows
    with sessionmaker(bind=second)() as db:
        saved = db.query(Campaign).one()
        assert saved.name == CAMPAIGN["name"]
        assert saved.strategy["core_message"] == STRATEGY["core_message"]
        assert saved.assets[0].content["headline"] == SOCIAL["headline"]
    second.dispose()


def test_existing_database_gains_new_columns_on_startup(tmp_path):
    """A database created by an older version keeps its rows when a new column is added."""
    import sqlalchemy as sa
    from sqlalchemy import text

    url = f"sqlite:///{(tmp_path / 'old.db').as_posix()}"
    old_engine = make_engine(url)

    # The campaigns table as an older version of the app would have created it
    # (no 'status' column), with one row already in it.
    with old_engine.begin() as conn:
        conn.execute(
            sa.text(
                """
                CREATE TABLE campaigns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(120) NOT NULL,
                    product_or_service VARCHAR(200) NOT NULL,
                    target_audience VARCHAR(300) NOT NULL,
                    objective VARCHAR(300) NOT NULL,
                    platform VARCHAR(40) NOT NULL,
                    tone VARCHAR(60) NOT NULL,
                    brief TEXT NOT NULL,
                    strategy JSON,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL
                )
                """
            )
        )
        conn.execute(
            sa.text(
                "INSERT INTO campaigns (name, product_or_service, target_audience, objective,"
                " platform, tone, brief, strategy, created_at, updated_at)"
                " VALUES ('Legacy', 'Old product', 'Everyone', 'Sell', 'Email', 'Calm', '',"
                " NULL, '2026-01-01 10:00:00', '2026-01-01 10:00:00')"
            )
        )
    old_engine.dispose()

    # The app "starts up" against the old database.
    new_engine = make_engine(url)
    from app.database import _ensure_schema

    _ensure_schema(new_engine)

    with new_engine.begin() as conn:
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(campaigns)"))}
        assert "status" in cols
        row = conn.execute(text("SELECT name, status FROM campaigns")).fetchone()
        assert row == ("Legacy", "draft")
    new_engine.dispose()


def test_deleting_a_campaign_cascades_in_the_database(tmp_path):
    engine = make_engine(f"sqlite:///{(tmp_path / 'cascade.db').as_posix()}")
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine)() as db:
        campaign = Campaign(**CAMPAIGN)
        campaign.assets.append(
            CreativeAsset(content_type="email", platform="Email", title="T", content={})
        )
        db.add(campaign)
        db.commit()
        db.delete(campaign)
        db.commit()
        assert db.query(CreativeAsset).count() == 0
    engine.dispose()
