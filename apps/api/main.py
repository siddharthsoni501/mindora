"""MINDORA FastAPI Application - Main Entry Point"""

import uvicorn
import os
import sys

# Add the apps directory to path
sys.path.insert(0, r'C:\Users\ASUS\OneDrive\Documents\governmentai\mindora\apps')

# Load the config directly from the file using importlib
import importlib.util
spec = importlib.util.spec_from_file_location(
    "api.core.config",
    r"C:\Users\ASUS\OneDrive\Documents\governmentai\mindora\apps\api\core\config.py"
)
config_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config_module)
settings = config_module.Settings

# Create the FastAPI app directly
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Use configured CORS origins or default
allowed_origins = getattr(settings, 'CORS_ORIGINS', ['http://localhost:3000', 'http://localhost:8080'])

app = FastAPI(
    title="MINDORA API",
    version="0.1.0",
    description="Private Personal AI with persistent, user-owned memory",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}

@app.get("/", include_in_schema=False)
async def root():
    return {"message": "MINDORA API", "version": "0.1.0"}
