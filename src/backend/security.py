"""
Security & Rate Limiting Module for Bedrock AgentCore Runtime.
Enforces IP-based rate limiting, max payload size guards, and internal secret verification.
"""
import os
import time
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException
from src.shared.logger import get_logger

logger = get_logger("backend_security")

# Rate limit storage: IP -> List of request timestamps
_ip_rate_records: Dict[str, List[float]] = {}

# Security settings
MAX_PAYLOAD_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
RATE_LIMIT_WINDOW_SECONDS = 300            # 5 minutes
MAX_REQUESTS_PER_WINDOW = 20               # Max 20 invocations per 5 mins per IP

# Optional shared secret to ensure only Amplify frontend can invoke backend
AGENTCORE_SECRET = os.getenv("AGENTCORE_SHARED_SECRET", "")
IS_PROD = os.getenv("ENV", "dev").lower() == "prod"

def extract_client_ip(request: Request) -> str:
    """Extracts client IP from AWS CloudFront/ALB forwarding headers or direct client."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"

def enforce_security_and_rate_limit(request: Request, body_bytes: bytes) -> Tuple[bool, str]:
    """
    Enforces payload size check, internal secret validation, and IP rate limits.
    Returns (True, ip) on success, or raises HTTPException.
    """
    # 1. Payload Size Guard
    if len(body_bytes) > MAX_PAYLOAD_SIZE_BYTES:
        logger.warning(f"Payload size {len(body_bytes)} exceeds {MAX_PAYLOAD_SIZE_BYTES} bytes limit.")
        raise HTTPException(
            status_code=413,
            detail="Payload Too Large: Maximum allowed upload size is 5MB."
        )

    # 2. Internal Shared Secret Verification (Production anti-scraping guard)
    if IS_PROD and AGENTCORE_SECRET:
        incoming_secret = request.headers.get("x-agentcore-secret", "")
        if incoming_secret != AGENTCORE_SECRET:
            logger.warning("Unauthorized direct invocation attempt without valid X-AgentCore-Secret.")
            raise HTTPException(
                status_code=401,
                detail="Unauthorized: Direct invocations must originate from authenticated Amplify gateway."
            )

    # 3. IP-based Sliding Window Rate Limiting
    client_ip = extract_client_ip(request)
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW_SECONDS

    if client_ip not in _ip_rate_records:
        _ip_rate_records[client_ip] = []

    # Clean old timestamps
    _ip_rate_records[client_ip] = [ts for ts in _ip_rate_records[client_ip] if ts > window_start]

    if len(_ip_rate_records[client_ip]) >= MAX_REQUESTS_PER_WINDOW:
        oldest_ts = _ip_rate_records[client_ip][0]
        retry_after = int(oldest_ts + RATE_LIMIT_WINDOW_SECONDS - now)
        logger.warning(f"Rate limit exceeded for IP {client_ip}. Requests: {len(_ip_rate_records[client_ip])}.")
        raise HTTPException(
            status_code=429,
            detail=f"Too Many Requests: Rate limit of {MAX_REQUESTS_PER_WINDOW} invocations per 5 minutes exceeded. Retry in {max(1, retry_after)} seconds.",
            headers={"Retry-After": str(max(1, retry_after))}
        )

    # Record current invocation
    _ip_rate_records[client_ip].append(now)

    return True, client_ip
