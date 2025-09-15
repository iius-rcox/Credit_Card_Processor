#!/usr/bin/env python
"""
Minimal test server to verify basic functionality
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Create minimal app
app = FastAPI(title="Test Server")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Test server is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Test bulk operations endpoint
@app.get("/api/bulk/sessions/info")
async def bulk_info():
    return {
        "max_sessions_per_operation": 1000,
        "supported_actions": ["delete", "export", "close", "archive"],
        "rate_limits": {
            "delete": {"requests": 10, "window": 60},
            "export": {"requests": 30, "window": 60}
        }
    }

if __name__ == "__main__":
    print("Starting minimal test server on port 8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")