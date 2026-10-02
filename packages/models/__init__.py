from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass, field
import os
import re
from enum import Enum


# ============================================================
# Model Provider Abstraction
# ============================================================


class ModelProvider(ABC):
    """Abstract base class for model providers."""

    @abstractmethod
    async def generate(self, model_id: str, messages: List[Dict[str, Any]], **kwargs) -> Dict[str, Any]:
        """Generate a completion using the specified model."""
        pass

    @abstractmethod
    async def stream(self, model_id: str, messages: List[Dict[str, Any]], **kwargs) -> Any:
        """Stream a completion using the specified model."""
        pass

    @abstractmethod
    async def embed(self, model_id: str, texts: List[str], **kwargs) -> List[List[float]]:
        """Create embeddings for the given texts."""
        pass


def create_model_provider() -> ModelProvider:
    """Factory function to create the appropriate model provider.

    Returns:
        ModelProvider instance based on configuration.
    """
    provider_name = os.getenv("MODEL_PROVIDER", "demo")

    if provider_name == "nebius":
        # Try to import Nebius provider
        try:
            from packages.models.nebius_provider import NebiusTokenFactoryProvider
            return NebiusTokenFactoryProvider()
        except ImportError:
            # Fall back to demo provider if Nebius not available
            pass

    # Demo provider for development without external credentials
    import warnings
    warnings.warn("Using demo model provider - no external credentials configured")
    
    class DemoModelProvider(ModelProvider):
        async def generate(self, model_id: str, messages: List[Dict[str, Any]], **kwargs) -> Dict[str, Any]:
            """Generate a demo response."""
            return {
                "id": "demo-response-id",
                "object": "chat.chat.completion",
                "created": 1234567890,
                "model": model_id,
                "choices": [
                    {
                        "index": 0,
                        "message": {
                            "role": "assistant",
                            "content": f"Demo response for: {messages[-1]['content'] if messages else 'no message'}",
                        },
                        "finish_reason": "stop",
                    }
                ],
                "usage": {
                    "prompt_tokens": sum(len(m.get("content", "")) for m in messages),
                    "completion_tokens": len(kwargs.get("max_tokens", 100)),
                    "total_tokens": sum(len(m.get("content", "")) for m in messages) + kwargs.get("max_tokens", 100),
                }
            }

        async def stream(self, model_id: str, messages: List[Dict[str, Any]], **kwargs) -> Any:
            """Stream demo response."""
            import json
            import asyncio
            
            full_content = f"Demo response for: {messages[-1]['content'] if messages else 'no message'}"
            words = full_content.split()
            
            for i, word in enumerate(words):
                chunk = {
                    "choices": [
                        {
                            "delta": {"content": word + " "},
                            "index": 0,
                        }
                    ]
                }
                yield chunk
                await asyncio.sleep(0.05)
            
            # Send done signal
            yield {"choices": [{"delta": {"content": ""}, "finish_reason": "stop", "index": 0}]}

        async def embed(self, model_id: str, texts: List[str], **kwargs) -> List[List[float]]:
            """Create demo embeddings (simple hash-based)."""
            embeddings = []
            for text in texts:
                # Simple hash-based embedding for demo
                hash_val = __import__("hashlib").sha256(text.encode()).hexdigest()
                embedding = [float(int(hash_val[i:i+2], 16)) / 255.0 for i in range(0, 32, 2)]
                # Pad to standard dimension
                embedding += [0.0] * (128 - len(embedding))
                embeddings.append(embedding[:128])
            return embeddings

    return DemoModelProvider()


# ============================================================
# Nebius Token Factory Provider
# ============================================================


class NebiusTokenFactoryProvider(ModelProvider):
    """Provider for NVIDIA Nemotron through Nebius Token Factory.

    Supports OpenAI-compatible API semantics where applicable.
    All model IDs are configurable via environment variables.
    """

    def __init__(self):
        self.api_key = os.getenv("NEBIUS_API_KEY", "")
        self.base_url = os.getenv("NEBIUS_BASE_URL", "https://api.nebius.ai/v1")
        self.default_fast_model = os.getenv("MINDORA_FAST_MODEL", "nvidia/nemotron")
        self.default_reasoning_model = os.getenv("MINDORA_REASONING_MODEL", "nvidia/nemotron")

        if not self.api_key:
            import warnings
            warnings.warn("NEBIUS_API_KEY not set - provider will operate in demo mode")

    async def generate(self, model_id: str, messages: List[Dict[str, Any]], **kwargs) -> Dict[str, Any]:
        """Generate a completion using the Nebius API.

        Args:
            model_id: The model identifier (e.g., "nvidia/nemotron")
            messages: List of message dicts with role and content
            **kwargs: Additional generation parameters (temperature, max_tokens, etc.)

        Returns:
            Dict with response, usage, and model information
        """
        import httpx

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model_id,
            "messages": messages,
            **kwargs,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=120.0)
            response.raise_for_status()
            return response.json()

    async def stream(self, model_id: str, messages: List[Dict[str, Any]], **kwargs) -> Any:
        """Stream a completion using the Nebius API.

        Args:
            model_id: The model identifier
            messages: List of message dicts
            **kwargs: Additional generation parameters

        Yields:
            Token chunks from the stream
        """
        import httpx
        import json

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model_id,
            "messages": messages,
            "stream": True,
            **kwargs,
        }

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST", url, headers=headers, json=payload, timeout=120.0
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data_str)
                            yield chunk
                        except json.JSONDecodeError:
                            continue

    async def embed(self, model_id: str, texts: List[str], **kwargs) -> List[List[float]]:
        """Create embeddings using the Nebius API.

        Args:
            model_id: The embedding model identifier
            texts: List of texts to embed
            **kwargs: Additional parameters

        Returns:
            List of embedding vectors
        """
        import httpx

        url = f"{self.base_url}/embeddings"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        embeddings = []
        batch_size = kwargs.get("batch_size", 20)

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]

            payload = {
                "model": model_id,
                "input": batch,
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload, timeout=120.0)
                response.raise_for_status()
                result = response.json()
                for embedding_entry in result.get("data", []):
                    embeddings.append(embedding_entry["embedding"])

        return embeddings


# ============================================================
# Routing Classification
# ============================================================


class RoutingLevel(Enum):
LOW = "low"
MEDIUM = "medium"
HIGH = "high"


class RouteReason(Enum):
"""Reasons for model routing decisions."""
ROUTINE_REQUEST = "routine request"
MULTI_STEP_TASK = "multi-step task"
COMPLEX_REASONING = "complex reasoning"
LARGE_CONTEXT = "large context reasoning"
PERSONAL_WORKFLOW = "personal workflow"
SIMPLE_QUESTION = "simple question"
SUMMARIZATION = "summarization"
MEMORY_EXTRACTION = "memory extraction"
CLASSIFICATION = "classification"


@dataclass
class RoutingDecision:
"""The result of model routing classification."""
level: RoutingLevel
reason: RouteReason
model_id: str
explanation: str = ""
latency_ms: Optional[int] = None


# ============================================================
# Model Router
# ============================================================


class ModelRouter:
"""Intelligent model router that classifies requests and routes
to appropriate models based on complexity.

Classification:
LOW  â†’ Fast Nemotron model
MEDIUM â†’ Fast Nemotron model
HIGH â†’ Reasoning Nemotron model
"""

def __init__(self, model_provider: Optional[ModelProvider] = None):
self.model_provider = model_provider or create_model_provider()

# Routing configuration from environment
self.fast_model = os.getenv("MINDORA_FAST_MODEL", "nvidia/nemotron")
self.reasoning_model = os.getenv("MINDORA_REASONING_MODEL", "nvidia/nemotron")

# Classification patterns
self.low_patterns = self._compile_patterns([
r"\b(what is|who is|explain.*simply|define)\b",
r"\b(summariz|list|count|how many)\b",
r"\b(quick|fast|brief)\b",
])

self.high_patterns = self._compile_patterns([
r"\b(plan|strateg|optimiz|analyze)\b",
r"\b(multi-step|complex|detailed)\b",
r"\b(compare|contrast|evaluate)\b",
r"\b(workflow|process|procedure)\b",
r"\b(if.*then|depends on|condition)\b",
])

self.medium_patterns = self._compile_patterns([
r"\b(help|guide|support)\b",
r"\b(example|sample|scenario)\b",
])

@staticmethod
def _compile_patterns(patterns: List[str]) -> re.Pattern:
"""Compile regex patterns for matching."""
combined = "|".join(patterns)
return re.compile(combined, re.IGNORECASE)

def classify_request(self, query: str) -> RoutingLevel:
"""Classify a user query into routing level.

Args:
query: The user's question or request

Returns:
RoutingLevel enum (LOW, MEDIUM, or HIGH)
"""
query_lower = query.lower().strip()

# Check high-patterns first (most specific)
if self.high_patterns.search(query_lower):
return RoutingLevel.HIGH

# Check low-patterns
if self.low_patterns.search(query_lower):
return RoutingLevel.LOW

# Check medium-patterns
if self.medium_patterns.search(query_lower):
return RoutingLevel.MEDIUM

# Default to MEDIUM for uncertain cases
return RoutingLevel.MEDIUM

def route(self, query: str) -> RoutingDecision:
"""Route a query to the appropriate model and determine reasoning.

Args:
query: The user's question or request

Returns:
RoutingDecision with level, model, reason, and explanation
"""
level = self.classify_request(query)

# Generate routing explanation
explanation = self._generate_explanation(level, query)

# Select model based on level
if level == RoutingLevel.HIGH:
model_id = self.reasoning_model
reason = RouteReason.COMPLEX_REASONING
elif level == RoutingLevel.MEDIUM:
model_id = self.fast_model
reason = RouteReason.ROUTINE_REQUEST
else:  # LOW
model_id = self.fast_model
reason = RouteReason.SIMPLE_QUESTION

return RoutingDecision(
level=level,
reason=reason,
model_id=model_id,
explanation=explanation,
)

def _generate_explanation(self, level: RoutingLevel, query: str) -> str:
"""Generate a concise routing explanation for the UI.

Never exposes hidden chain-of-thought.
Only displays a concise routing explanation.
"""
if level == RoutingLevel.LOW:
return "Routine request - fast model"
elif level == RoutingLevel.MEDIUM:
return "Standard request - fast model"
else:  # HIGH
return "Multi-step task - reasoning model"

def get_routing_display(self, decision: RoutingDecision) -> str:
"""Get the formatted routing display string for UI.

Example formats:
            "Nemotron Nano Fast route"
            "Nemotron Ultra Reasoning route"
"""
model_name = decision.model_id.split("/")[-1] if "/" in decision.model_id else decision.model_id
route_text = f"{model_name} {decision.level.value.title()} route"

if decision.level == RoutingLevel.HIGH:
route_text = f"{model_name} Reasoning route"
elif decision.level == RoutingLevel.LOW:
route_text = f"{model_name} Fast route"

return route_text


# ============================================================
# Router for API integration (legacy compatibility)
# ============================================================


class Router:
"""Legacy/compatibility router class for API integration."""

def __init__(self, fast_model: str = None, reasoning_model: str = None):
self.fast_model = fast_model or os.getenv("MINDORA_FAST_MODEL", "nvidia/nemotron")
self.reasoning_model = reasoning_model or os.getenv("MINDORA_REASONING_MODEL", "nvidia/nemotron")

def route_query(self, query: str) -> Dict[str, Any]:
"""Route a query and return model selection info.

Returns dict with routing info for the API layer.
"""
router = ModelRouter()
decision = router.route(query)

return {
"model_id": decision.model_id,
"route": decision.level.value,
"reason": decision.reason.value,
"explanation": decision.explanation,
"display": router.get_routing_display(decision),
        }


# ============================================================
# Hash utility
# ============================================================


def generate_hash(input_str: str) -> str:
    """Generate a short hash string."""
    return __import__("hashlib").sha256(input_str.encode()).hexdigest()[:16]
