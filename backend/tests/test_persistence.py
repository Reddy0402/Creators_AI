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
