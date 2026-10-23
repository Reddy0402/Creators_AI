import json

import groq
import httpx

from app.config import Settings
from app.main import app
from app.services.ai_service import AIService, get_ai_service
from tests.conftest import STRATEGY, FakeClient


def _request():
    return httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")


def status_error(cls, status):
    return cls("provider said no", response=httpx.Response(status, request=_request()), body=None)


def rate_limit():
    return status_error(groq.RateLimitError, 429)


def strategy(client, campaign):
    return client.post(f"/api/campaigns/{campaign['id']}/strategy")


def test_strategy_is_validated_and_saved(client, use_ai, campaign):
    use_ai(STRATEGY)
    response = strategy(client, campaign)
    assert response.status_code == 200
    assert response.json()["strategy"]["concepts"][1]["name"] == "Recycled Pride"
    assert client.get(f"/api/campaigns/{campaign['id']}").json()["strategy"]["core_message"] == STRATEGY["core_message"]


def test_strategy_prompt_uses_campaign_context(client, use_ai, campaign):
    fake = use_ai(STRATEGY)
    strategy(client, campaign)
    call = fake.calls[0]
    assert "Urban commuters aged 22-35" in call["messages"][1]["content"]
    assert "Drive pre-orders" in call["messages"][1]["content"]
    assert call["max_tokens"] == 3000
    assert call["response_format"] == {"type": "json_object"}


def test_missing_api_key_gives_clear_error(client, campaign):
    cfg = Settings(_env_file=None, groq_api_key="")
    app.dependency_overrides[get_ai_service] = lambda: AIService(cfg)
    response = strategy(client, campaign)
    assert response.status_code == 503
    assert "GROQ_API_KEY" in response.json()["detail"]


def test_authentication_error_is_not_retried(client, use_ai, campaign):
    fake = use_ai(status_error(groq.AuthenticationError, 401), STRATEGY)
    response = strategy(client, campaign)
    assert response.status_code == 502
    assert "credentials" in response.json()["detail"]
    assert len(fake.calls) == 1


def test_error_responses_never_contain_the_api_key(client, use_ai, campaign):
    use_ai(status_error(groq.AuthenticationError, 401))
    assert "test-key" not in strategy(client, campaign).text


def test_rate_limit_is_retried_a_bounded_number_of_times(client, use_ai, campaign):
    fake = use_ai(rate_limit(), rate_limit(), rate_limit(), STRATEGY)
    response = strategy(client, campaign)
    assert response.status_code == 429
    assert len(fake.calls) == 3  # first attempt + 2 retries, the 4th reply is never used


def test_transient_rate_limit_recovers(client, use_ai, campaign):
    fake = use_ai(rate_limit(), STRATEGY)
    assert strategy(client, campaign).status_code == 200
    assert len(fake.calls) == 2


def test_server_errors_and_timeouts_are_retried(client, use_ai, campaign):
    fake = use_ai(status_error(groq.InternalServerError, 503), groq.APITimeoutError(request=_request()), STRATEGY)
    assert strategy(client, campaign).status_code == 200
    assert len(fake.calls) == 3


def test_persistent_timeout_returns_504(client, use_ai, campaign):
    timeout = groq.APITimeoutError(request=_request())
    use_ai(timeout, timeout, timeout)
    assert strategy(client, campaign).status_code == 504


def test_connection_failure_returns_502(client, use_ai, campaign):
    err = groq.APIConnectionError(request=_request())
    use_ai(err, err, err)
    assert strategy(client, campaign).status_code == 502


def test_unknown_model_gives_actionable_message(client, use_ai, campaign):
    use_ai(status_error(groq.NotFoundError, 404))
    response = strategy(client, campaign)
    assert response.status_code == 502 and "GROQ_MODEL" in response.json()["detail"]


def test_malformed_output_is_repaired_once(client, use_ai, campaign):
    fake = use_ai("Sure! here is your strategy", STRATEGY)
    assert strategy(client, campaign).status_code == 200
    assert len(fake.calls) == 2
    assert "not valid" in fake.calls[1]["messages"][-1]["content"]


def test_persistently_malformed_output_is_not_saved(client, use_ai, campaign):
    fake = use_ai("not json", '{"positioning": "only one field"}')
    response = strategy(client, campaign)
    assert response.status_code == 502
    assert len(fake.calls) == 2
    assert client.get(f"/api/campaigns/{campaign['id']}").json()["strategy"] is None


def test_strategy_with_wrong_number_of_concepts_is_rejected(client, use_ai, campaign):
    bad = {**STRATEGY, "concepts": STRATEGY["concepts"][:2]}
    use_ai(bad, bad)
    assert strategy(client, campaign).status_code == 502
    assert client.get(f"/api/campaigns/{campaign['id']}").json()["strategy"] is None


def test_empty_model_reply_is_an_error(client, use_ai, campaign):
    use_ai("   ")
    assert strategy(client, campaign).status_code == 502


def test_code_fenced_json_is_accepted(client, use_ai, campaign):
    use_ai("```json\n" + json.dumps(STRATEGY) + "\n```")
    assert strategy(client, campaign).status_code == 200


def test_json_mode_rejection_falls_back_to_plain_generation(client, use_ai, campaign):
    fake = use_ai(status_error(groq.BadRequestError, 400), STRATEGY)
    assert strategy(client, campaign).status_code == 200
    assert "response_format" in fake.calls[0]
    assert "response_format" not in fake.calls[1]


def test_failed_regeneration_keeps_existing_strategy(client, use_ai, campaign_with_strategy):
    use_ai(status_error(groq.AuthenticationError, 401))
    assert client.post(f"/api/campaigns/{campaign_with_strategy['id']}/strategy").status_code == 502
    kept = client.get(f"/api/campaigns/{campaign_with_strategy['id']}").json()["strategy"]
    assert kept["core_message"] == STRATEGY["core_message"]


def test_json_mode_can_be_disabled_by_config():
    fake = FakeClient(STRATEGY)
    cfg = Settings(_env_file=None, groq_api_key="k", groq_json_mode=False, groq_model="some-model")
    from types import SimpleNamespace

    AIService(cfg, fake).generate_strategy(
        SimpleNamespace(name="n", product_or_service="p", target_audience="a", objective="o",
                        platform="X", tone="t", brief="")
    )
    assert "response_format" not in fake.calls[0]
    assert fake.calls[0]["model"] == "some-model"  # model ID comes only from settings
