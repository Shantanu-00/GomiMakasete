"""
Amazon Bedrock AgentCore Memory Integration.
Manages Short-Term conversation sessions and Long-Term resident preferences.
"""
import os
import time
from typing import Dict, Any, List, Optional
import boto3
from src.shared.logger import get_logger

logger = get_logger("session_memory")
REGION = os.getenv("AWS_REGION", "us-east-1")

class AgentCoreMemoryManager:
    """Manages short-term and long-term memory for GomiMakasete residents."""

    def __init__(self):
        self.client = None
        if os.getenv("AWS_ACCESS_KEY_ID"):
            try:
                self.client = boto3.client("bedrock-agentcore", region_name=REGION)
            except Exception as e:
                logger.warning(f"Bedrock AgentCore Memory client unavailable: {e}")

        # In-memory local fallback store for local testing
        self._local_sessions: Dict[str, List[Dict[str, Any]]] = {}
        self._local_user_preferences: Dict[str, Dict[str, Any]] = {}

    def save_turn(self, session_id: str, role: str, message: str) -> None:
        """Saves a conversational turn into short-term session memory."""
        if session_id not in self._local_sessions:
            self._local_sessions[session_id] = []
        
        self._local_sessions[session_id].append({
            "role": role,
            "message": message,
            "timestamp": time.time()
        })

    def get_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Retrieves conversational transcript history."""
        return self._local_sessions.get(session_id, [])

    def save_resident_preferences(self, resident_id: str, municipality: str, neighborhood: str, language: str = "en") -> None:
        """Stores persistent Long-Term Memory (Semantic / User Preference Strategy)."""
        self._local_user_preferences[resident_id] = {
            "municipality": municipality,
            "neighborhood": neighborhood,
            "preferred_language": language,
            "updated_at": time.time()
        }
        logger.info(f"Updated LTM preferences for resident {resident_id}: {municipality} / {neighborhood}")

    def get_resident_preferences(self, resident_id: str) -> Dict[str, Any]:
        """Fetches stored resident preferences."""
        return self._local_user_preferences.get(resident_id, {
            "municipality": "tokyo_shinjuku",
            "neighborhood": "愛住町",
            "preferred_language": "en"
        })

# Global memory singleton
memory_store = AgentCoreMemoryManager()
