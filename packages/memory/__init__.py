from __future__ import annotations

from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone, timedelta
import asyncio
import hashlib
import json

import numpy as np

from packages.models import ModelProvider, create_model_provider


# ============================================================
# Memory Categories
# ============================================================


class MemoryType:
FACT = "fact"
EPISODE = "episode"
SKILL = "skill"


# ============================================================
# Confidence Levels
# ============================================================

CONFIDENCE_STRONG = 0.90
CONFIDENCE_CANDIDATE = 0.60
CONFIDENCE_POOR = 0.60


# ============================================================
# Sensitivity Classifier
# ============================================================


class SensitivityClassifier:
"""Classifies memory candidates for sensitivity."""

SENSITIVE_PATTERNS = [
"password",
"api_key",
"secret",
"token",
"credit_card",
"ssn",
"social security",
"bank_account",
"private key",
"auth token",
]

@classmethod
def is_sensitive(cls, content: str) -> bool:
"""Check if content contains sensitive information."""
content_lower = content.lower()
for pattern in cls.SENSITIVE_PATTERNS:
if pattern in content_lower:
return True
return False

@classmethod
def classify(
cls, content: str,
) -> str:
"""Classify sensitivity level."""
if cls.is_sensitive(content):
return "high"
# Check for moderately personal info
        content_lower = content.lower()
personal_patterns = ["email", "phone", "address", "health"]
for pattern in personal_patterns:
if pattern in content_lower:
return "medium"
return "low"


# ============================================================
# Memory Extraction
# ============================================================


class MemoryExtractor:
"""Extracts durable memories from conversations."""

def __init__(self, model_provider: Optional[ModelProvider] = None):
self.model_provider = model_provider or create_model_provider()

async def extract_from_conversation(
self, conversation_text: str, user_id: str,
) -> List[Dict[str, Any]]:
"""Extract candidate memories from a conversation.

Args:
conversation_text: The full conversation text
user_id: The user identifier

Returns:
List of candidate memories with confidence scores
"""
candidates = []

# Extract preferences (FACT)
preferences = await self._extract_preferences(conversation_text)
candidates.extend(preferences)

# Extract project decisions / important events (EPISODE)
episodes = await self._extract_episodes(conversation_text)
candidates.extend(episodes)

# Skill-like workflows (SKILL)
skills = await self._extract_skills(conversation_text)
candidates.extend(skills)

# Filter and score
return await self._score_and_filter(candidates, user_id)

async def _extract_preferences(self, text: str) -> List[Dict[str, Any]]:
"""Extract user preferences from text."""
candidates = []

# Look for preference patterns
preference_indicators = [
r"I prefer[,.]",
r"I like[,.]",
r"I dislike[,.]",
r"I usually[,.]",
r"I always[,.]",
r"I never[,.]",
]

import re
for pattern in preference_indicators:
matches = re.findall(pattern, text, re.IGNORECASE)
for match in matches:
# Extract surrounding context (simple approach)
candidates.append(
{
"type": MemoryType.FACT,
"key": f"preference_{hashlib.md5(match.encode()).hexdigest()[:8]}",
"content": match.strip(),
"source_type": "conversation",
}
)

return candidates

async def _extract_episodes(self, text: str) -> List[Dict[str, Any]]:
"""Extract important episodic memories."""
candidates = []

# Look for important event patterns
episode_indicators = [
r"we decided[,.]",
r"we discussed[,.]",
r"we completed[,.]",
r"important[:.]",
r"project[:.]",
r"milestone[:.]",
]

import re
for pattern in episode_indicators:
matches = re.findall(pattern, text, re.IGNORECASE)
for match in matches:
candidates.append(
{
"type": MemoryType.EPISODE,
"key": f"episode_{hashlib.md5(match.encode()).hexdigest()[:8]}",
"content": match.strip(),
"source_type": "conversation",
}
)

return candidates

async def _extract_skills(self, text: str) -> List[Dict[str, Any]]:
"""Extract skill-like workflows."""
candidates = []

# Look for skill/workflow patterns
skill_indicators = [
r"save this as a skill[,.]",
r"weekly planning[,.]",
r"morning brief[,.]",
r"study planning[,.]",
r"project review[,.]",
]

import re
for pattern in skill_indicators:
matches = re.findall(pattern, text, re.IGNORECASE)
for match in matches:
candidates.append(
{
"type": MemoryType.SKILL,
"key": f"skill_{hashlib.md5(match.encode()).hexdigest()[:8]}",
"content": match.strip(),
"source_type": "conversation",
}
)

return candidates

async def _score_and_filter(
self, candidates: List[Dict[str, Any]], user_id: str,
) -> List[Dict[str, Any]]:
"""Score and filter candidates based on confidence and sensitivity."""
scored = []
for candidate in candidates:
# Skip sensitive data automatically
sensitivity = SensitivityClassifier.classify(candidate["content"])
if sensitivity == "high":
# High sensitivity requires user confirmation
candidate["sensitivity"] = "high"
candidate["auto_persist"] = False
candidate["confidence"] = 0.5  # Low confidence for auto-persist
scored.append(candidate)
continue

# Extract confidence from content analysis
confidence = await self._calculate_confidence(candidate["content"])
candidate["confidence"] = confidence
candidate["sensitivity"] = sensitivity
candidate["auto_persist"] = confidence >= CONFIDENCE_STRONG

scored.append(candidate)

return scored

async def _calculate_confidence(self, content: str) -> float:
"""Calculate confidence score for a memory candidate.

Rules:
- >= 0.90: Strong candidate (persist automatically)
- 0.60-0.89: Candidate / confirmation recommended
- < 0.60: Do not persist automatically
"""
# Simple confidence based on content characteristics
length = len(content.strip())

# Longer, more specific statements get higher confidence
if length > 100:
base = 0.95
elif length > 50:
base = 0.80
elif length > 20:
base = 0.65
else:
base = 0.40

# Specific patterns get boost
specific_markers = ["prefers", "usually", "typically", "favorite", "like"]
content_lower = content.lower()
if any(marker in content_lower for marker in specific_markers):
base = min(base + 0.1, 1.0)

# Very short statements (single facts) get lower confidence
if length < 10:
base = max(base - 0.2, 0.0)

return round(base, 2)


# ============================================================
# Memory Retrieval
# ============================================================


class MemoryRetriever:
"""Retrieves relevant memories for context construction."""

def __init__(
self,
top_k: int = 8,
relevance_threshold: float = 0.60,
model_provider: Optional[ModelProvider] = None,
):
self.top_k = top_k
self.relevance_threshold = relevance_threshold
self.model_provider = model_provider or create_model_provider()

async def retrieve(
self,
query: str,
user_memories: List[Dict[str, Any]],
user_id: str,
metadata_filters: Optional[Dict[str, Any]] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
"""Retrieve relevant memories for a user query.

Args:
query: The user's current question/query
user_memories: List of user memories to search through
user_id: The user identifier
metadata_filters: Optional filters (memory type, etc.)

Returns:
Tuple of (selected memories, retrieval metadata)
"""
if not user_memories:
return [], {"query": query, "count": 0, "reason": "no_memories"}

# Generate query embedding
query_embedding = await self._generate_embedding([query])
if not query_embedding:
return [], {"query": query, "count": 0, "reason": "embedding_failed"}

# Calculate similarity with each memory
scored_memories = []
for memory in user_memories:
# Skip disabled memories
if not memory.get("enabled", True):
continue

# Apply metadata filters
if metadata_filters:
if memory.get("type") not in metadata_filters.get("types", []):
continue

# Calculate similarity (cosine similarity using numpy)
memory_embedding = memory.get("embedding")
if memory_embedding and query_embedding:
similarity = self._cosine_similarity(
query_embedding[0], memory_embedding
)
else:
# Fallback: keyword-based scoring
similarity = self._keyword_similarity(query, memory.get("content", ""))

# Apply relevance threshold
if similarity >= self.relevance_threshold:
scored_memories.append(
{
"memory": memory,
"similarity": similarity,
}
)

# Sort by similarity (descending) and take top-k
scored_memories.sort(key=lambda x: x["similarity"], reverse=True)
selected = [s["memory"] for s in scored_memories[: self.top_k]]

# Update last_used_at for selected memories
now = datetime.now(timezone.utc)
for memory in selected:
if "last_used_at" not in memory or memory["last_used_at"] is None:
memory["last_used_at"] = now.isoformat()

metadata = {
"query": query,
"count": len(selected),
"total_considered": len(user_memories),
"reason": "semantic_search",
}

return selected, metadata

@staticmethod
def _cosine_similarity(a: List[float], b: List[float]) -> float:
"""Calculate cosine similarity between two vectors."""
a = np.array(a, dtype=np.float64)
b = np.array(b, dtype=np.float64)

if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
return 0.0

return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

@staticmethod
def _keyword_similarity(query: str, content: str) -> float:
"""Simple keyword-based similarity fallback."""
query_words = set(query.lower().split())
content_words = set(content.lower().split())

if not query_words or not content_words:
return 0.0

intersection = query_words.intersection(content_words)
union = query_words.union(content_words)

return len(intersection) / len(union) if union else 0.0

async def _generate_embedding(self, texts: List[str]) -> Optional[List[List[float]]]:
"""Generate embeddings for texts using the model provider."""
if not texts:
return None

try:
provider = self.model_provider
embeddings = await provider.embed(
model_id=os.getenv("MINDORA_FAST_MODEL", "nvidia/nemotron"),
texts=texts,
)
return embeddings
except Exception as e:
# Fallback: return None, will use keyword similarity
return None


# ============================================================
# Memory Conflict Detection
# ============================================================


class MemoryConflictDetector:
"""Detects contradictory memories."""

@staticmethod
def detect_conflicts(memories: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
"""Detect if there are conflicting memories.

Args:
memories: List of memories to check for conflicts

Returns:
Conflict info if found, None if no conflicts
"""
# Group memories by type and look for opposite statements
fact_memories = [
m for m in memories if m.get("type") == MemoryType.FACT
]

# Look for opposite preferences
preferences = {}
for memory in fact_memories:
content = memory.get("content", "").lower()
# Check for preference patterns
if any(
word in content
for word in ["prefer", "like", "dislike", "usually", "typically"]
):
# Extract the preference essence
preferences.setdefault("preference", []).append(content)

# Check for opposite preferences
if len(preferences.get("preference", [])) >= 2:
# Simple conflict detection: look for opposite adjectives
pref_contents = preferences["preference"]
if len(pref_contents) >= 2:
# Check if first contains "concise" and second contains "detailed" or vice versa
has_concise = any("concise" in c for c in pref_contents)
has_detailed = any("detailed" in c or "extensive" in c for c in pref_contents)

if has_concise and has_detailed:
return {
"type": "preference_conflict",
"description": "Potential preference conflict detected.",
"memories": [
m for m in memories
if any(
word in m.get("content", "").lower()
for word in ["concise", "detailed", "extensive"]
)
],
"resolution_options": [
"Concise",
"Detailed",
"Keep both by context",
],
}

return None


# ============================================================
# Memory Freshness
# ============================================================

MEMORY_FRESH_ACTIVE = "ACTIVE"
MEMORY_FRESH_STALE = "STALE"
MEMORY_FRESH_DISABLED = "DISABLED"
MEMORY_FRESH_DELETED = "DELETED"


class MemoryFreshness:
"""Manages memory freshness status."""

@staticmethod
def get_status(memory: Dict[str, Any]) -> str:
"""Get the freshness status of a memory."""
if not memory.get("enabled", True):
return MEMORY_FRESH_DISABLED

expires_at = memory.get("expires_at")
if expires_at:
try:
expire_date = datetime.fromisoformat(expires_at)
now = datetime.now(timezone.utc)
if now > expire_date:
return MEMORY_FRESH_STALE
except (ValueError, TypeError):
pass

return MEMORY_FRESH_ACTIVE

@staticmethod
def needs_refresh(memory: Dict[str, Any]) -> bool:
"""Check if memory needs refreshing."""
status = MemoryFreshness.get_status(memory)
return status in (MEMORY_FRESH_STALE, MEMORY_FRESH_DISABLED)


# ============================================================
# Export utilities
# ============================================================


def memory_to_dict(memory: Dict[str, Any]) -> Dict[str, Any]:
"""Convert memory dict for serialization."""
result = dict(memory)
result["type"] = memory.get("type", MemoryType.FACT)
result["sensitivity"] = memory.get("sensitivity", "low")
result["freshness"] = MemoryFreshness.get_status(memory)
return result


def format_memory_for_context(memories: List[Dict[str, Any]]) -> str:
"""Format memories as context string for model prompting."""
if not memories:
return ""

context_parts = []
for i, memory in enumerate(memories, 1):
memory_type = memory.get("type", "fact").upper()
confidence = memory.get("confidence", 1.0) * 100
source = memory.get("source_type", "conversation")
key = memory.get("key", "")

part = f"[{memory_type} Â· {confidence:.0f}% Â· Source: {source}]"
if key:
part += f" Â· Key: {key}"
part += f": {memory.get('content', '')}"

context_parts.append(part)

return "\n".join(context_parts)
