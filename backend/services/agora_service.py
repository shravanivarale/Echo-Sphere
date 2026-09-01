"""
Agora token service.
In MOCK_MODE=true: returns a mock token (no Agora credentials needed).
In MOCK_MODE=false: generates a real Agora RTC token using the Agora token builder.
"""

import os
import secrets

MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"
AGORA_APP_ID = os.getenv("AGORA_APP_ID", "")
AGORA_APP_CERTIFICATE = os.getenv("AGORA_APP_CERTIFICATE", "")


def generate_agora_token(channel_name: str, uid: int = 0) -> dict:
    """
    Generate an Agora RTC token for the given channel.
    Returns dict with: app_id, channel, uid, token, mock
    """
    if MOCK_MODE:
        return {
            "app_id": "MOCK_APP_ID",
            "channel": channel_name,
            "uid": uid or 12345,
            "token": f"MOCK_TOKEN_{secrets.token_hex(8).upper()}",
            "mock": True,
        }

    # LIVE mode — requires agora-token package
    try:
        # pip install agora-token-builder
        from agora_token_builder import RtcTokenBuilder, Role_Publisher
        import time
        expiry = int(time.time()) + 3600  # 1 hour
        token = RtcTokenBuilder.buildTokenWithUid(
            AGORA_APP_ID, AGORA_APP_CERTIFICATE,
            channel_name, uid, Role_Publisher, expiry
        )
        return {
            "app_id": AGORA_APP_ID,
            "channel": channel_name,
            "uid": uid,
            "token": token,
            "mock": False,
        }
    except ImportError:
        # Fallback to mock if package not installed
        return {
            "app_id": AGORA_APP_ID or "MISSING",
            "channel": channel_name,
            "uid": uid or 12345,
            "token": f"FALLBACK_MOCK_{secrets.token_hex(8).upper()}",
            "mock": True,
            "warning": "agora-token-builder not installed. Using mock token.",
        }
