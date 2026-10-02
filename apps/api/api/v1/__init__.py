"""MINDORA FastAPI Application - Main Entry Point"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

import os
import asyncio

from packages.models import re

# Check what's parameters: [])
from packages.memory import MemoryExtractor, MemoryRetriever, MemoryConflictDetector, MemoryFreshness, SensitivityClassifier, memory_to_dict, format_memory_for_context
from packages.skills import Skill, SkillCreator, SkillType
from packages.tools import ToolGateway, ToolDefinition, RISK_LEVEL_LOW, RISK_LEVEL_MEDIUM, RISK_LEVEL_HIGH
from packages.models import ModelProvider, create_model_provider, ModelRouter, RoutingDecision

from api.core.config import settings
from api.db.models import User, UserSettings, Conversation, Message, Memory, MemoryEmbedding, MemorySource, MemoryVersion, Skill as SkillModel, SkillStep as SkillStepModel, SkillVersion as SkillVersionModel, ToolIntegration, ToolPermission, ToolRun, Task, TaskRun, Automation, Notification, ModelRequest, UsageRecord, AuditLog, SecurityEvent
from api.db.models import engine, SQLModel

# Create tables on startup
async def create_tables():
    SQLModel.metadata.create_all(engine)

# Dependency to get current user (simplified for now)
def get_current_user():
    """Get current authenticated user - simplified for demo."""
    # In production, this would validate JWT/session
    return {"id": "user_123", "email": "user@mindora.example"}

# Dependency to get model provider
def get_model_provider() -> ModelProvider:
    return create_model_provider()

# Dependency to get model router
def get_model_router() -> ModelRouter:
    return ModelRouter(get_model_provider())

# Dependency to get memory extractor
def get_memory_extractor() -> MemoryExtractor:
    return MemoryExtractor(get_model_provider())

# Dependency to get memory retriever
def get_memory_retriever() -> MemoryRetriever:
    return MemoryRetriever(
        top_k=int(os.getenv("MEMORY_TOP_K", "8")),
        relevance_threshold=float(os.getenv("MEMORY_RELEVANCE_THRESHOLD", "0.60")),
    )

# Dependency to get skill creator
def get_skill_creator() -> SkillCreator:
    return SkillCreator()

# Dependency to get tool gateway
def get_tool_gateway(user_id: str = Depends(get_current_user)) -> ToolGateway:
    return ToolGateway(user_id=user_id)

# Dependency to get model router for API
def get_model_router_api() -> ModelRouter:
    return ModelRouter()


# ============================================================
# Application Lifespan
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    await create_tables()
    yield
    # Shutdown: Cleanup
    pass

# Create FastAPI app
app = FastAPI(
    title="MINDORA API",
    version="0.1.0",
    description="Private Personal AI with persistent, user-owned memory",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# API Routes
# ============================================================

@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "ok", "mode": os.getenv("APP_ENV", "development")}


@app.post("/api/v1/chat", response_model=dict)
async def chat(
    message: str,
    conversation_id: Optional[str] = None,
    model_router: ModelRouter = Depends(get_model_router_api),
    memory_retriever: MemoryRetriever = Depends(get_memory_retriever),
    current_user: dict = Depends(get_current_user),
):
    """Main chat endpoint with memory, routing, and context."""
    
    from packages.memory import format_memory_for_context
    
    # Step 1: Route the model
    routing_decision = model_router.route(message)
    
    # Step 2: Retrieve relevant memories
    memories, retrieval_metadata = await memory_retriever.retrieve(
        query=message,
        user_memories=[],  # Would fetch from DB in production
        user_id=current_user["id"],
    )
    
    # Step 3: Format memories for context
    memories_context = format_memory_for_context(memories) if memories else ""
    
    # Step 4: Build the prompt with context
    # In a real implementation, this would construct a proper prompt
    # with retrieved memories, user preferences, etc.
    prompt = f"{memories_context}\nUser: {message}\nAssistant:"
    
    # Step 5: Generate response using model provider
    try:
        provider = get_model_provider()
        # Note: In demo mode without API key, this will fall back
        response = await provider.generate(
            model_id=routing_decision.model_id,
            messages=[{"role": "user", "content": message}],
        )
        
        assistant_response = response.get("choices", [{}])[0].get("message", {}).get("content", "")
        
    except Exception as e:
        # Fallback response if model not configured
        assistant_response = f"I understand you're asking about: '{message}'. "
        "I'm currently in demo mode without external model configuration. "
        "Please configure your NEBIUS_API_KEY to use the full AI capabilities."
    
    # Step 6: Extract memories from conversation (periodic)
    # This would typically happen after meaningful conversations
    # extractor = MemoryExtractor(get_model_provider())
    # new_memories = await extractor.extract_from_conversation(message, current_user["id"])
    # ... persist new memories ...
    
    return {
        "response": assistant_response,
        "model": routing_decision.model_id,
        "route": routing_decision.level.value,
        "reason": routing_decision.reason.value,
        "memories_used": len(memories),
        "model_route": routing_decision.level.name.lower(),
    }


@app.get("/api/v1/memories", response_model=dict)
async def list_memories(
    current_user: dict = Depends(get_current_user),
    memory_retriever: MemoryRetriever = Depends(get_memory_retriever),
):
    """List user memories."""
    # In production, would fetch from database
    # For now, return empty list
    return {
        "memories": [],
        "count": 0,
    }


@app.post("/api/v1/memories", response_model=dict)
async def create_memory(
    key: str,
    content: str,
    memory_type: str = MemoryType.FACT,
    current_user: dict = Depends(get_current_user),
):
    """Create a new memory entry."""
    # Validate sensitivity
    sensitivity = SensitivityClassifier.classify(content)
    
    # Check confidence threshold
    extractor = MemoryExtractor(get_model_provider())
    # In a real implementation, would calculate confidence and persist
    
    return {
        "status": "created",
        "key": key,
        "type": memory_type,
        "sensitivity": sensitivity,
        "user_confirmed": sensitivity != "high",  # High sensitivity requires confirmation
    }


@app.patch("/api/v1/memories/{memory_id}", response_model=dict)
async def edit_memory(
    memory_id: str,
    new_content: str,
    current_user: dict = Depends(get_current_user),
):
    """Edit an existing memory."""
    # Would find memory by ID, update, and create version
    # Would also detect conflicts
    return {
        "status": "updated",
        "memory_id": memory_id,
        "new_content": new_content,
    }


@app.delete("/api/v1/memories/{memory_id}", response_model=dict)
async def delete_memory(
    memory_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a memory."""
    # Would delete from DB, remove embeddings, invalidate cache
    # Would record audit event
    return {
        "status": "deleted",
        "memory_id": memory_id,
    }


@app.post("/api/v1/memories/search", response_model=dict)
async def search_memories(
    query: str,
    current_user: dict = Depends(get_current_user),
    memory_retriever: MemoryRetriever = Depends(get_memory_retriever),
):
    """Search user memories."""
    memories, metadata = await memory_retriever.retrieve(
        query=query,
        user_memories=[],  # Would fetch from DB
        user_id=current_user["id"],
    )
    
    return {
        "memories": memories,
        "count": len(memories),
        "query": metadata.get("query"),
    }


@app.post("/api/v1/skills", response_model=dict)
async def create_skill(
    name: str,
    description: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    skill_creator: SkillCreator = Depends(get_skill_creator),
):
    """Create a new skill."""
    # Ask for confirmation before saving
    # In production, would ask user for confirmation
    
    skill = skill_creator.from_conversation(
        conversation_text="",  # Would have conversation context
        user_id=current_user["id"],
        skill_name=name,
    )
    
    return {
        "id": skill.id,
        "name": skill.name,
        "description": skill.description,
        "version": skill.version,
        "steps": [s.step_number for s in skill.steps],
        "required_tools": skill.required_tools,
    }


@app.post("/api/v1/skills/{skill_id}/run", response_model=dict)
async def run_skill(
    skill_id: str,
    current_user: dict = Depends(get_current_user),
    memory_retriever: MemoryRetriever = Depends(get_memory_retriever),
    tool_gateway: ToolGateway = Depends(lambda: get_tool_gateway(current_user["id"])),
):
    """Execute a skill."""
    # Would fetch skill from DB
    # For now, return basic response
    return {
        "status": "skill_execution_pending",
        "skill_id": skill_id,
    }


@app.get("/api/v1/tools", response_model=dict)
async def list_tools(
    tool_gateway: ToolGateway = Depends(get_tool_gateway),
):
    """List available tools and their permission status."""
    status = tool_gateway.get_all_tools_status()
    return {"tools": status}


@app.patch("/api/v1/tools/{tool_id}/permissions", response_model=dict)
async def update_tool_permissions(
    tool_id: str,
    permissions: Dict[str, bool],
    current_user: dict = Depends(get_current_user),
    tool_gateway: ToolGateway = Depends(get_tool_gateway),
):
    """Update tool permissions."""
    for permission, allowed in permissions.items():
        tool_gateway.set_permission(tool_id, permission, allowed)
    
    return {
        "status": "permissions_updated",
        "tool_id": tool_id,
        "permissions": permissions,
    }


@app.get("/api/v1/model-router", response_model=dict)
async def get_model_routing(
    query: str,
    model_router: ModelRouter = Depends(get_model_router_api),
):
    """Get model routing decision for a query."""
    decision = model_router.route(query)
    return {
        "level": decision.level.value,
        "model_id": decision.model_id,
        "reason": decision.reason.value,
        "explanation": decision.explanation,
        "display": model_router.get_routing_display(decision),
    }


@app.post("/api/v1/audit", response_model=dict)
async def log_audit(
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    sensitivity: str = "low",
    current_user: dict = Depends(get_current_user),
):
    """Log an audit event."""
    # Would persist to audit_log table
    return {
        "status": "audit_logged",
        "action": action,
        "resource_type": resource_type,
    }


@app.get("/api/v1/health", include_in_schema=False)
async def api_health():
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
async def root():
    return {"message": "MINDORA API", "version": "0.1.0"}
