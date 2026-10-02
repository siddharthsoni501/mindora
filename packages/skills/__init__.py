from __future__ import annotations

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import json


# ============================================================
# Skill Types
# ============================================================


class SkillType:
    AUTOMATED = "automated"
    MANUAL = "manual"


# ============================================================
# Skill Step Model
# ============================================================


class SkillStep:
    """Individual step within a skill workflow."""

    def __init__(
        self,
        step_number: int,
        action: str,
        parameters: Optional[Dict[str, Any]] = None,
        tool_name: Optional[str] = None,
    ):
        self.step_number = step_number
        self.action = action
        self.parameters = parameters or {}
        self.tool_name = tool_name

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "step_number": self.step_number,
            "action": self.action,
            "parameters": self.parameters,
            "tool_name": self.tool_name,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> SkillStep:
        """Create from dictionary."""
        return cls(
            step_number=data.get("step_number", 1),
            action=data.get("action", ""),
            parameters=data.get("parameters"),
            tool_name=data.get("tool_name"),
        )


# ============================================================
# Skill Model
# ============================================================


class Skill:
    """Reusable workflow/skill for autonomous execution."""

    def __init__(
        self,
        id: str,
        user_id: str,
        name: str,
        description: Optional[str] = None,
        version: float = 1.0,
        skill_type: str = SkillType.AUTOMATED,
        steps: Optional[List[SkillStep]] = None,
        required_tools: Optional[List[str]] = None,
        enabled: bool = True,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
    ):
        self.id = id
        self.user_id = user_id
        self.name = name
        self.description = description
        self.version = version
        self.type = skill_type
        self.steps = steps or []
        self.required_tools = required_tools or []
        self.enabled = enabled
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or datetime.now(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "type": self.type,
            "steps": [step.to_dict() for step in self.steps],
            "required_tools": self.required_tools,
            "enabled": self.enabled,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> Skill:
        """Create from dictionary."""
        steps = [
            SkillStep.from_dict(s) for s in data.get("steps", [])
        ]
        return cls(
            id=data.get("id", ""),
            user_id=data.get("user_id", ""),
            name=data.get("name", ""),
            description=data.get("description"),
            version=data.get("version", 1.0),
            skill_type=data.get("type", SkillType.AUTOMATED),
            steps=steps,
            required_tools=data.get("required_tools", []),
            enabled=data.get("enabled", True),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )

    def add_step(self, step: SkillStep) -> None:
        """Add a step to the skill."""
        self.steps.append(step)
        self.updated_at = datetime.now(timezone.utc)

    def remove_step(self, step_number: int) -> Optional[SkillStep]:
        """Remove a step by number. Returns the removed step or None."""
        for i, step in enumerate(self.steps):
            if step.step_number == step_number:
                removed = self.steps.pop(i)
                self.updated_at = datetime.now(timezone.utc)
                return removed
        return None

    def get_step(self, step_number: int) -> Optional[SkillStep]:
        """Get a step by number."""
        for step in self.steps:
            if step.step_number == step_number:
                return step
        return None

    def execute(
        self,
        memory_retriever,
        tool_gateway,
        user_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute the skill workflow.

        Args:
            memory_retriever: MemoryRetriever instance
            tool_gateway: ToolGateway instance for authorized tool access
            user_context: User context including current state

        Returns:
            Execution result with outputs from each step
        """
        results = {
            "skill_id": self.id,
            "skill_name": self.name,
            "steps_executed": [],
            "step_results": [],
            "overall_status": "completed",
            "errors": [],
        }

        for step in self.steps:
            try:
                step_result = self._execute_step(
                    step, memory_retriever, tool_gateway, user_context
                )
                results["steps_executed"].append(step.step_number)
                results["step_results"].append(
                    {
                        "step": step.step_number,
                        "action": step.action,
                        "result": step_result.get("result"),
                        "output": step_result.get("output"),
                        "error": step_result.get("error"),
                    }
                )

                if step_result.get("error"):
                    results["errors"].append(
                        f"Step {step.step_number}: {step_result['error']}"
                    )
                    # Decide whether to continue or stop
                    if step_result.get("halt_on_error", False):
                        results["overall_status"] = "failed"
                        break

            except Exception as e:
                results["steps_executed"].append(step.step_number)
                results["step_results"].append(
                    {
                        "step": step.step_number,
                        "action": step.action,
                        "result": None,
                        "error": str(e),
                    }
                )
                results["errors"].append(str(e))
                results["overall_status"] = "failed"
                break

        return results

    def _execute_step(
        self,
        step: SkillStep,
        memory_retriever,
        tool_gateway,
        user_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute a single skill step.

        Args:
            step: The skill step to execute
            memory_retriever: MemoryRetriever instance
            tool_gateway: ToolGateway instance
            user_context: User context

        Returns:
            Step execution result dict
        """
        action = step.action
        parameters = step.parameters

        # Handle memory retrieval steps
        if "retrieve" in action.lower() or "memory" in action.lower():
            # Extract query from parameters or use default
            query = parameters.get("query", "")
            if not query:
                # Use current user context as query
                query = user_context.get("current_query", "")

            memories, metadata = memory_retriever.retrieve(
                query=query,
                user_memories=user_context.get("memories", []),
                user_id=self.user_id,
            )

            return {
                "result": {
                    "memories": memories,
                    "metadata": metadata,
                },
                "output": {
                    "memories_retrieved": len(memories),
                    "query": query,
                },
                "error": None,
            }

        # Handle tool execution steps
        elif step.tool_name and step.tool_name in user_context.get(
            "available_tools", []
        ):
            # Check permissions and execute through tool gateway
            tool_result = tool_gateway.execute_tool(
                tool_name=step.tool_name,
                action=action,
                parameters=parameters,
                user_id=self.user_id,
            )

            return {
                "result": tool_result.get("result"),
                "output": tool_result.get("output", {}),
                "error": tool_result.get("error"),
            }

        # Generic step - return context
        else:
            return {
                "result": {
                    "action": action,
                    "parameters": parameters,
                    "note": "Step executed (no specific tool/memory action)",
                },
                "output": {
                    "action": action,
                    "executed": True,
                },
                "error": None,
            }

    def version(self) -> Skill:
        """Create a new version of this skill."""
        new_version = Skill(
            id=f"{self.id}_v{self.version + 1}",
            user_id=self.user_id,
            name=self.name,
            description=self.description,
            version=self.version + 1,
            skill_type=self.type,
            steps=self.steps.copy(),  # Copy current steps
            required_tools=self.required_tools.copy(),
            enabled=self.enabled,
            created_at=datetime.now(timezone.utc),
        )
        self.updated_at = datetime.now(timezone.utc)
        return new_version

    def duplicate(self) -> Skill:
        """Create a duplicate of this skill."""
        return Skill(
            id=f"{self.id}_duplicated",
            user_id=self.user_id,
            name=f"{self.name} (copy)",
            description=self.description,
            version=1.0,
            skill_type=self.type,
            steps=self.steps.copy(),
            required_tools=self.required_tools.copy(),
            enabled=self.enabled,
            created_at=datetime.now(timezone.utc),
        )

    def disable(self) -> Skill:
        """Disable this skill version."""
        self.enabled = False
        self.updated_at = datetime.now(timezone.utc)
        return self


# ============================================================
# Skill Creation from Conversation
# ============================================================


class SkillCreator:
    """Converts successful workflows into structured skills."""

    @staticmethod
    def from_conversation(
        conversation_text: str,
        user_id: str,
        skill_name: str,
    ) -> Skill:
        """Create a skill from a conversation.

        Args:
            conversation_text: The conversation that led to the skill
            user_id: The user identifier
            skill_name: Name for the new skill

        Returns:
            A new Skill instance
        """
        steps = []

        # Parse common skill patterns from conversation
        import re

        # Look for numbered or bullet-point workflows
        lines = conversation_text.split("\n")

        step_patterns = [
            r"^\d+[\.\)]\s*(.+)$",  # "1. Read calendar"
            r"^[-*]\s*(.+)$",  # "- Read calendar"
        ]

        step_number = 1
        for line in lines:
            for pattern in step_patterns:
                match = re.match(pattern, line.strip())
                if match:
                    action = match.group(1).strip()
                    if action:
                        steps.append(
                            SkillStep(
                                step_number=step_number,
                                action=action,
                            )
                        )
                        step_number += 1
                        break

        # If no structured steps found, create a basic skill
        if not steps:
            steps = [
                SkillStep(
                    step_number=1,
                    action="review_conversation",
                    parameters={"source": conversation_text[:200]},
                )
            ]

        required_tools = SkillCreator._extract_required_tools(conversation_text)

        return Skill(
            id=f"skill_{generate_hash(skill_name)[:8]}",
            user_id=user_id,
            name=skill_name,
            description=f"Automated skill created from conversation: {skill_name}",
            version=1.0,
            skill_type=SkillType.AUTOMATED,
            steps=steps,
            required_tools=required_tools,
        )

    @staticmethod
    def _extract_required_tools(conversation_text: str) -> List[str]:
        """Extract tool references from conversation text."""
        tools = []
        import re

        tool_patterns = [
            r"\bcalendar\b",
            r"\b tasks?\b",
            r"\b email\b",
            r"\b notes?\b",
            r"\b file\b",
            r"\b web\b",
        ]

        text_lower = conversation_text.lower()
        for pattern in tool_patterns:
            if re.search(pattern, text_lower):
                # Map to canonical tool name
                tool_map = {
                    "calendar": "calendar",
                    "tasks": "tasks",
                    "email": "email",
                    "notes": "notes",
                    "file": "files",
                    "web": "web",
                }
                mapped = tool_map.get(pattern, pattern)
                if mapped not in tools:
                    tools.append(mapped)

        return tools


# Hash utility (simple)
import hashlib


def generate_hash(input_str: str) -> str:
    """Generate a short hash string."""
return hashlib.sha256(input_str.encode()).hexdigest()[:16]
