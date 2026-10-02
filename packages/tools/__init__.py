from __future__ import annotations

from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
import json
import asyncio
import os

from packages.skills import SkillStep, SkillCreator, SkillType


# ============================================================
# Risk Levels
# ============================================================

RISK_LEVEL_LOW = "LOW"
RISK_LEVEL_MEDIUM = "MEDIUM"
RISK_LEVEL_HIGH = "HIGH"
RISK_LEVEL_BLOCKED = "BLOCKED"


# ============================================================
# Tool Schemas (Pydantic-like validation)
# ============================================================


class ToolSchema:
    """Base class for tool input/output schemas."""

    def validate_input(self, input_data: Dict[str, Any]) -> Tuple[bool, str]:
        """Validate input data against schema.

        Returns:
            (is_valid, error_message)
        """
        raise NotImplementedError

    def validate_output(self, output_data: Dict[str, Any]) -> Tuple[bool, str]:
        """Validate output data against schema.

        Returns:
            (is_valid, error_message)
        """
        raise NotImplementedError


# ============================================================
# Tool Definitions
# ============================================================


class ToolDefinition:
    """Definition of a tool with its metadata."""

    def __init__(
        self,
        name: str,
        kind: str,
        description: str,
        input_schema: Dict[str, Any],
        output_schema: Dict[str, Any],
        risk_level: str = RISK_LEVEL_LOW,
        required_permissions: Optional[List[str]] = None,
        sandbox_policy: Optional[Dict[str, Any]] = None,
    ):
        self.name = name
        self.kind = kind
        self.description = description
        self.input_schema = input_schema
        self.output_schema = output_schema
        self.risk_level = risk_level
        self.required_permissions = required_permissions or []
        self.sandbox_policy = sandbox_policy or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "name": self.name,
            "kind": self.kind,
            "description": self.description,
            "risk_level": self.risk_level,
            "required_permissions": self.required_permissions,
            "sandbox_policy": self.sandbox_policy,
        }


# ============================================================
# Predefined Tool Definitions
# ============================================================

# Calendar tool - READ permission is low risk, WRITE is medium
CALENDAR_READ = ToolDefinition(
    name="calendar",
    kind="calendar",
    description="Access and read calendar events",
    input_schema={
        "type": "object",
        "properties": {
            "action": {"type": "string", "enum": ["read_events", "list_calendars"]},
            "date_from": {"type": "string", "format": "date-time"},
            "date_to": {"type": "string", "format": "date-time"},
        },
        "required": ["action"],
    },
    output_schema={
        "type": "object",
        "properties": {
            "events": {"type": "array", "items": {"type": "object"}},
            "calendars": {"type": "array", "items": {"type": "object"}},
        },
    },
    risk_level=RISK_LEVEL_LOW,
    required_permissions=["read_calendar"],
)

# Calendar create event - MEDIUM risk (requires approval)
CALENDAR_CREATE = ToolDefinition(
    name="calendar",
    kind="calendar",
    description="Create a new calendar event",
    input_schema={
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "start_time": {"type": "string", "format": "date-time"},
            "end_time": {"type": "string", "format": "date-time"},
            "calendar_id": {"type": "string"},
        },
        "required": ["title", "start_time", "end_time"],
    },
    output_schema={
        "type": "object",
        "properties": {
            "event_id": {"type": "string"},
            "title": {"type": "string"},
            "start_time": {"type": "string"},
            "end_time": {"type": "string"},
        },
    },
    risk_level=RISK_LEVEL_MEDIUM,
    required_permissions=["create_event"],
)

# Email tool - HIGH risk (requires explicit approval)
EMAIL_SEND = ToolDefinition(
    name="email",
    kind="email",
    description="Send an email message",
    input_schema={
        "type": "object",
        "properties": {
            "to": {"type": "string", "format": "email"},
            "subject": {"type": "string"},
            "body": {"type": "string"},
            "html_body": {"type": "string"},
        },
        "required": ["to", "subject", "body"],
    },
    output_schema={
        "type": "object",
        "properties": {
            "message_id": {"type": "string"},
            "sent": {"type": "boolean"},
        },
    },
    risk_level=RISK_LEVEL_HIGH,
    required_permissions=["send_email"],
)

# File access - MEDIUM risk (restricted directory)
FILE_READ = ToolDefinition(
    name="files",
    kind="files",
    description="Read files from allowed directories",
    input_schema={
        "type": "object",
        "properties": {
            "action": {"type": "string", "enum": ["read", "list"]},
            "path": {"type": "string"},
        },
        "required": ["action", "path"],
    },
    output_schema={
        "type": "object",
        "properties": {
            "content": {"type": "string"},
            "files": {"type": "array", "items": {"type": "object"}},
        },
    },
    risk_level=RISK_LEVEL_MEDIUM,
    required_permissions=["read_files"],
)

# Tasks tool - LOW risk
TASKS_READ = ToolDefinition(
    name="tasks",
    kind="tasks",
    description="Read tasks and task lists",
    input_schema={
        "type": "object",
        "properties": {
            "action": {"type": "string", "enum": ["list", "get"]},
            "list_id": {"type": "string"},
        },
        "required": ["action"],
    },
    output_schema={
        "type": "object",
        "properties": {
            "tasks": {"type": "array", "items": {"type": "object"}},
        },
    },
    risk_level=RISK_LEVEL_LOW,
    required_permissions=["read_tasks"],
)


# ============================================================
# Tool Gateway - Central Orchestration
# ============================================================


class ToolGateway:
    """Gateway that mediates all tool execution between LLM and actual tools.

    Architecture:
    LLM
    â†“
    Tool Intent
    â†“
    Schema Validation
    â†“
    Permission Check
    â†“
    Risk Assessment
    â†“
    User Approval (for medium/high risk)
    â†“
    Sandbox
    â†“
    Tool Execution
    â†“
    Result Validation
    """

    def __init__(self, user_id: str, tool_integrations: Optional[List[ToolDefinition]] = None):
        self.user_id = user_id
        # Available tools from integrations
        self.available_tools: Dict[str, ToolDefinition] = {}
        if tool_integrations:
            for tool_def in tool_integrations:
                self.available_tools[tool_def.name] = tool_def

        # User permissions per tool
        self.user_permissions: Dict[str, Dict[str, bool]] = {}
        self._approval_pending: Dict[str, Dict[str, Any]] = {}

    def register_tool(self, tool_def: ToolDefinition) -> None:
        """Register a tool definition with the gateway."""
        self.available_tools[tool_def.name] = tool_def

    def set_permission(self, tool_name: str, permission: str, allowed: bool, requires_approval: bool = False) -> None:
        """Set user permission for a specific tool action."""
        if tool_name not in self.user_permissions:
            self.user_permissions[tool_name] = {}

        self.user_permissions[tool_name][permission] = {
            "allowed": allowed,
            "requires_approval": requires_approval,
        }

    def can_tool_be_used(self, tool_name: str, permission: str) -> bool:
        """Check if a user can use a tool with a specific permission."""
        if tool_name not in self.user_permissions:
            return False

        tool_perms = self.user_permissions[tool_name]
        if permission not in tool_perms:
            return False

        perm_data = tool_perms[permission]
        if not perm_data["allowed"]:
            return False

        if perm_data["requires_approval"] and not self._is_approved(tool_name, permission):
            return False

        return True

    def _is_approved(self, tool_name: str, permission: str) -> bool:
        """Check if a high-risk action has user approval."""
        approval_key = f"{tool_name}:{permission}"
        if approval_key in self._approval_pending:
            approval = self._approval_pending[approval_key]
            # Check if approved within timeout (default 24h)
            created_at = approval.get("created_at")
            if created_at:
                from datetime import datetime
                try:
                    created = datetime.fromisoformat(created_at)
                    from dateutil import parser
                    # Approved if within 24 hours and user confirmed
                    now = datetime.now(timezone.utc)
                    delta = (now - created).total_seconds()
                    return delta < 86400 and approval.get("approved", False)
                except (ValueError, TypeError):
                    pass
            return approval.get("approved", False)
        return False

    async def approve_action(
        self,
        tool_name: str,
        permission: str,
        description: str,
        approval_id: str,
    ) -> bool:
        """Record user approval for a high-risk action.

        Args:
            tool_name: Name of the tool
            permission: Specific permission being approved
            description: Description of what will happen
            approval_id: User's approval identifier

        Returns:
            True if approval was recorded
        """
        approval_key = f"{tool_name}:{permission}"
        self._approval_pending[approval_key] = {
            "description": description,
            "approved_by": approval_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "approved": True,
        }
        return True

    async def check_and_execute(
        self,
        tool_name: str,
        action: str,
        input_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Check permissions and execute a tool call.

        This is the main entry point that implements the full gateway pipeline:
        Schema Validation â†’ Permission Check â†’ Risk Assessment â†’ User Approval â†’ Sandbox â†’ Execution â†’ Result Validation

        Returns:
            Dict with execution result, error information, and approval status
        """
        # Step 1: Get tool definition
        tool_def = self.available_tools.get(tool_name)
        if not tool_def:
            return {
                "success": False,
                "error": f"Tool '{tool_name}' not found or not configured.",
                "risk_level": RISK_LEVEL_BLOCKED,
                "requires_approval": False,
            }

        # Step 2: Schema validation
        is_valid, error_msg = tool_def.input_schema.validate_input(input_data)
        if not is_valid:
            return {
                "success": False,
                "error": f"Input validation failed: {error_msg}",
                "risk_level": tool_def.risk_level,
                "requires_approval": False,
            }

        # Step 3: Permission check
        # Determine the permission needed based on action
        permission = self._determine_permission(tool_def, action)
        
        if not self.can_tool_be_used(tool_name, permission):
            # Check if approval is possible
            if tool_def.risk_level in (RISK_LEVEL_MEDIUM, RISK_LEVEL_HIGH):
                return {
                    "success": False,
                    "error": f"Permission denied for '{tool_name}'::{permission}. "
                             f"High-risk action requires user approval.",
                    "risk_level": tool_def.risk_level,
                    "requires_approval": True,
                    "tool_name": tool_name,
                    "permission": permission,
                }
            else:
                return {
                    "success": False,
                    "error": f"Permission denied for '{tool_name}'::{permission}.",
                    "risk_level": tool_def.risk_level,
                    "requires_approval": False,
                }

        # Step 4: Risk assessment (already partially done via permission check)
        risk_level = tool_def.risk_level

        # Step 5: For medium/high risk, ensure explicit approval
        if risk_level in (RISK_LEVEL_MEDIUM, RISK_LEVEL_HIGH):
            approval_key = f"{tool_name}:{permission}"
            if approval_key in self._approval_pending:
                approval = self._approval_pending[approval_key]
                if not approval.get("approved", False):
                    return {
                        "success": False,
                        "error": f"High-risk action requires explicit user approval. "
                                 f"Action: {description}",
                        "risk_level": risk_level,
                        "requires_approval": True,
                        "approval_pending": True,
                        "tool_name": tool_name,
                    }
            else:
                # No approval recorded - request it
                return {
                    "success": False,
                    "error": f"High-risk action requires user approval before execution.",
                    "risk_level": risk_level,
                    "requires_approval": True,
                    "tool_name": tool_name,
                    "approval_needed": True,
                }

        # Step 6: Execute in sandbox
        try:
            result = await self._execute_in_sandbox(tool_def, input_data)
            
            # Step 7: Validate result
            is_valid, validation_error = tool_def.output_schema.validate_output(
                result if isinstance(result, dict) else {}
            )
            
            if not is_valid:
                return {
                    "success": False,
                    "error": f"Result validation failed: {validation_error}",
                    "risk_level": risk_level,
                    "requires_approval": False,
                }
            
            return {
                "success": True,
                "result": result,
                "risk_level": risk_level,
                "requires_approval": False,
                "tool_name": tool_name,
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Tool execution error: {str(e)}",
                "risk_level": risk_level,
                "requires_approval": False,
            }

    def _determine_permission(self, tool_def: ToolDefinition, action: str) -> str:
        """Determine the required permission for a tool action."""
        # Map tool actions to permissions
        action_lower = action.lower()
        
        if tool_def.name == "calendar":
            if any(word in action_lower for word in ["read", "list", "get"]):
                return "read_calendar"
            elif any(word in action_lower for word in ["create", "add", "modify"]):
                return "create_event"
            elif any(word in action_lower for word in ["delete", "remove"]):
                return "delete_event"
        
        elif tool_def.name == "email":
            if any(word in action_lower for word in ["send"]):
                return "send_email"
        
        elif tool_def.name == "files":
            if any(word in action_lower for word in ["read", "list"]):
                return "read_files"
        
        elif tool_def.name == "tasks":
            if any(word in action_lower for word in ["list", "get"]):
                return "read_tasks"
        
        # Default: read permission
        return "read"

    async def _execute_in_sandbox(
        self,
        tool_def: ToolDefinition,
        input_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute a tool in a controlled sandbox environment.

        In production, this would use actual integration or a sandboxed
        execution environment. For now, it simulates the execution.
        """
        # Simulate sandbox execution based on tool kind
        kind = tool_def.kind
        
        if kind == "calendar":
            action = input_data.get("action", "")
            if action == "read_events":
                # Simulate reading calendar events
                return {
                    "events": [
                        {
                            "id": "event_1",
                            "title": "Team Meeting",
                            "start": "2024-01-15T10:00:00Z",
                            "end": "2024-01-15T11:00:00Z",
                        }
                    ]
                }
            elif action == "list_calendars":
                return {
                    "calendars": [
                        {"id": "cal_1", "name": "Primary Calendar"}
                    ]
                }
        
        elif kind == "email":
            # Email execution requires explicit approval - should not reach here without it
            raise PermissionError("Email execution requires explicit user approval")
        
        elif kind == "files":
            action = input_data.get("action", "")
            path = input_data.get("path", "")
            
            # Check path against sandbox policy
            sandbox_policy = tool_def.sandbox_policy
            allowed_dirs = sandbox_policy.get("allowed_directories", [])
            
            # Simple path check - in production would be more robust
            if allowed_dirs:
                path_allowed = any(path.startswith(d) for d in allowed_dirs)
                if not path_allowed:
                    raise PermissionError(
                        f"File access denied. Path '{path}' outside allowed directories: {allowed_dirs}"
                    )
            
            # Simulate file read
            return {
                "content": f"File content from: {path}",
                "files": []
            }
        
        elif kind == "tasks":
            action = input_data.get("action", "")
            if action == "list":
                return {
                    "tasks": [
                        {"id": "task_1", "title": "Finish report", "completed": False},
                        {"id": "task_2", "title": "Call client", "completed": True},
                    ]
                }
        
        # Default fallback
        return {
            "result": "Tool executed in sandbox",
            "input": input_data,
        }

    def get_tool_status(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """Get the status of a tool integration.

        Returns dict with connection status, permissions, risk level, etc.
        """
        tool_def = self.available_tools.get(tool_name)
        if not tool_def:
            return None

        permissions = self.user_permissions.get(tool_name, {})
        
        return {
            "name": tool_def.name,
            "kind": tool_def.kind,
            "risk_level": tool_def.risk_level,
            "connected": True,  # Would check actual connection status
            "permissions": {
                perm: data["allowed"]
                for perm, data in permissions.items()
            },
            "required_permissions": tool_def.required_permissions,
        }

    def get_all_tools_status(self) -> Dict[str, Any]:
        """Get status of all registered tools."""
        return {
            tool_name: self.get_tool_status(tool_name)
            for tool_name in self.available_tools
        }
