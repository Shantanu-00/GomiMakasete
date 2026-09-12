"""
Unit Tests for Security & Rate Limiting Controls.
Verifies IP sliding-window protection and max payload enforcement.
"""
import time
from fastapi.testclient import TestClient
from src.backend.app import app
import src.backend.security as security_module

client = TestClient(app)

def test_payload_size_rejection():
    """Verify that payloads exceeding 5MB are rejected with HTTP 413."""
    oversized_data = b"x" * (security_module.MAX_PAYLOAD_SIZE_BYTES + 1024)
    response = client.post(
        "/invocations",
        content=oversized_data,
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 413
    assert "Payload Too Large" in response.json()["detail"]

def test_ip_rate_limiting_enforcement():
    """Verify that spamming the invocations endpoint triggers HTTP 429 Too Many Requests."""
    test_ip = "198.51.100.42"
    security_module._ip_rate_records[test_ip] = []

    # Fill up to max allowed requests
    for _ in range(security_module.MAX_REQUESTS_PER_WINDOW):
        res = client.post(
            "/invocations",
            json={"action": "chat", "prompt": "Hello"},
            headers={"x-forwarded-for": test_ip}
        )
        assert res.status_code == 200

    # The (MAX + 1)th request must be rejected with 429
    blocked_res = client.post(
        "/invocations",
        json={"action": "chat", "prompt": "Hello again"},
        headers={"x-forwarded-for": test_ip}
    )
    assert blocked_res.status_code == 429
    assert "Too Many Requests" in blocked_res.json()["detail"]
    assert "Retry-After" in blocked_res.headers
