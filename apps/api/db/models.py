from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime, UTC
import uuid


# ============================================================
# Core Models
# ============================================================


class User(SQLModel, table=True):
    """User model with multi-tenancy."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    is_active: bool = True
    is_superuser: bool = False
    is_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    conversations: List["Conversation"] = Relationship(back_populates="user")
    memories: List["Memory"] = Relationship(back_populates="user")
    skills: List["Skill"] = Relationship(back_populates="user")
    automations: List["Automation"] = Relationship(back_populates="user")


class UserSettings(SQLModel, table=True):
    """User settings."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid = Field(index=True, foreign_key="user.id")
    remember_preferences: bool = True
    default_model_route: str = "fast"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    user: User = Relationship(back_populates="settings")


# ============================================================
# Conversation Models
# ============================================================


class Conversation(SQLModel, table=True):
    """Conversation thread."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid = Field(index=True, foreign_key="user.id")
    title: Optional[str] = None
    is_archived: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    user: User = Relationship(back_populates="conversations")
    messages: List["Message"] = Relationship(back_populates="conversation")


class Message(SQLModel, table=True):
    """Chat message."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    conversation_id: uuid = Field(index=True, foreign_key="conversation.id")
    role: str  # "user" or "assistant"
    content: str
    tool_calls: Optional[List[dict]] = None
    tool_results: Optional[List[dict]] = None
    model_used: Optional[str] = None
    model_route: Optional[str] = None  # "fast" or "reasoning"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    conversation: Conversation = Relationship(back_populates="messages")


# ============================================================
# Memory Models (Core Subsystem)
# ============================================================


class MemoryType(str):
    FACT = "fact"
    EPISODE = "episode"
    SKILL = "skill"


class Memory(SQLModel, table=True):
    """User memory - the core persistent memory subsystem."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid = Field(index=True, foreign_key="user.id")
    type: MemoryType
    key: str  # Unique key within type for the user
    content: str
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    source_type: str = "conversation"
    source_id: Optional[str] = None
    user_confirmed: bool = False
    enabled: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    # Relationships
    user: User = Relationship(back_populates="memories")
    versions: List["MemoryVersion"] = Relationship(back_populates="memory")


class MemoryEmbedding(SQLModel, table=True):
    """Vector embedding for memory semantic search."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    memory_id: uuid = Field(index=True, foreign_key="memory.id")
    embedding: list[float]  # Vector embeddings
    model_used: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    memory: Memory = Relationship(back_populates="embeddings")


class MemorySource(SQLModel, table=True):
    """Track where memory came from."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    memory_id: uuid = Field(index=True, foreign_key="memory.id")
    source_type: str  # "conversation", "skill", "manual", etc.
    source_id: Optional[str] = None
    extracted_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    sensitivity: str = "low"  # "low", "medium", "high"

    memory: Memory = Relationship(back_populates="sources")


class MemoryVersion(SQLModel, table=True):
    """Version history for memory changes."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    memory_id: uuid = Field(index=True, foreign_key="memory.id")
    version_number: int
    content: str
    changed_by: Optional[str] = None
    changed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    reason: Optional[str] = None  # "user_edit", "conflict_resolution", "auto_update"

    memory: Memory = Relationship(back_populates="versions")


# ============================================================
# Skill Models
# ============================================================


class SkillType(str):
    AUTOMATED = "automated"
    MANUAL = "manual"


class Skill(SQLModel, table=True):
    """Reusable skill/workflow."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid = Field(index=True, foreign_key="user.id")
    name: str
    description: Optional[str] = None
    version: float = Field(default=1.0)
    type: SkillType = SkillType.AUTOMATED
    steps: List["SkillStep"] = Relationship(back_populates="skill")
    required_tools: List[str] = []
    enabled: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    user: User = Relationship(back_populates="skills")


class SkillStep(SQLModel, table=True):
    """Individual step in a skill."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    skill_id: uuid = Field(index=True, foreign_key="skill.id")
    step_number: int
    action: str  # e.g., "read_calendar", "retrieve_memories"
    parameters: Optional[dict] = None
    tool_name: Optional[str] = None


class SkillVersion(SQLModel, table=True):
    """Skill version history."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    skill_id: uuid = Field(index=True, foreign_key="skill.id")
    version_number: int
    steps: List[SkillStep]
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ============================================================
# Tool Models
# ============================================================


class ToolIntegration(SQLModel, table=True):
    """Tool integration configuration."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid = Field(index=True, foreign_key="user.id")
    name: str  # e.g., "google_calendar", "gmail"
    kind: str  # e.g., "calendar", "email"
    config: dict = {}  # Tool-specific configuration
    permissions: dict = {}  # e.g., {"read": True, "write": False}
    risk_level: str = "LOW"  # LOW, MEDIUM, HIGH, BLOCKED
    enabled: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    user: User = Relationship(back_populates="tool_integrations")


class ToolPermission(SQLModel, table=True):
    """Specific permission record."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    integration_id: uuid = Field(index=True, foreign_key="tool_integration.id")
    action: str  # e.g., "read_calendar", "create_event"
    allowed: bool = False
    requires_approval: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ToolRun(SQLModel, table=True):
    """Tool execution record."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    integration_id: uuid = Field(index=True, foreign_key="tool_integration.id")
    user_id: uuid = Field(index=True, foreign_key="user.id")
    action: str
    status: str  # "pending", "running", "completed", "failed"
    input_data: dict
    output_data: Optional[dict] = None
    error: Optional[str] = None
    execution_time: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ============================================================
# Task & Automation Models
# ============================================================


class Task(SQLModel, table=True):
    """Task or automation task."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid = Field(index=True, foreign_key="user.id")
    name: str
    description: Optional[str] = None
    task_type: str  # e.g., "automation", "scheduled"
    trigger: Optional[str] = None  # cron expression or event trigger
    status: str = "pending"  # pending, running, completed, failed
    result: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    run_at: Optional[datetime] = None

    user: User = Relationship(back_populates="tasks")


class TaskRun(SQLModel, table=True):
    """Task execution record."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    task_id: uuid = Field(index=True, foreign_key="task.id")
    user_id: uuid = Field(index=True, foreign_key="user.id")
    status: str = "pending"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[dict] = None
    error: Optional[str] = None


class Automation(SQLModel, table=True):
    """Scheduled automation."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid = Field(index=True, foreign_key="user.id")
    name: str
    description: Optional[str] = None
    task_id: uuid = Field(default=None, foreign_key="task.id")
    cron_expression: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    user: User = Relationship(back_populates="automations")


# ============================================================
# Model & Usage Models
# ============================================================


class ModelRequest(SQLModel, table=True):
    """Model request log."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid = Field(index=True, foreign_key="user.id")
    model_id: str
    model_route: str  # "fast" or "reasoning"
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    request_type: str  # "chat", "embed", "complete"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class UsageRecord(SQLModel, table=True):
    """Usage tracking."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid = Field(index=True, foreign_key="user.id")
    model_request_id: uuid = Field(default=None, foreign_key="model_request.id")
    tokens_used: int
    request_type: str
    cost: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AuditLog(SQLModel, table=True):
    """Audit log for security and compliance."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid = Field(index=True, foreign_key="user.id")
    action: str  # e.g., "memory_created", "memory_deleted", "tool_executed"
    resource_type: str  # e.g., "memory", "skill", "tool"
    resource_id: Optional[str] = None
    details: Optional[dict] = None
    sensitivity: str = "low"  # "low", "medium", "high"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SecurityEvent(SQLModel, table=True):
    """Security events."""
    id: uuid = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid = Field(index=True, foreign_key="user.id")
    event_type: str  # e.g., "prompt_injection_attempt", "unauthorized_tool_access"
    severity: str = "low"  # low, medium, high, critical
    description: str
    blocked: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
