"""
WebSocket manager for real-time updates in Credit Card Processor

This module provides WebSocket infrastructure for:
- Real-time processing progress updates
- Session status changes
- Error notifications
- Completion alerts
"""

import json
import asyncio
import logging
from typing import Dict, Set, Any, Optional, List
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from .database import get_db
from .auth import get_current_user_ws, UserInfo
from .models import ProcessingSession, SessionStatus

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        # Active WebSocket connections by session_id
        self.session_connections: Dict[str, Set[WebSocket]] = {}
        # User connections for authentication tracking
        self.user_connections: Dict[WebSocket, str] = {}
        # Connection metadata
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        
    async def connect(self, websocket: WebSocket, session_id: str, user: UserInfo):
        """Accept a WebSocket connection and register it"""
        await websocket.accept()
        
        # Initialize session connections if not exists
        if session_id not in self.session_connections:
            self.session_connections[session_id] = set()
            
        # Add connection to session
        self.session_connections[session_id].add(websocket)
        
        # Track user for this connection
        self.user_connections[websocket] = user.username
        
        # Store metadata
        self.connection_metadata[websocket] = {
            "session_id": session_id,
            "user": user.username,
            "connected_at": datetime.now(timezone.utc),
            "is_admin": user.is_admin
        }
        
        logger.info(f"WebSocket connected - Session: {session_id}, User: {user.username}")
        
        # Send initial connection confirmation
        await self.send_to_connection(websocket, {
            "type": "connection_confirmed",
            "session_id": session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "Real-time updates enabled"
        })
        
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        session_id = None
        username = "unknown"
        
        try:
            # Get session_id for this connection
            metadata = self.connection_metadata.get(websocket, {})
            session_id = metadata.get("session_id")
            username = metadata.get("user", "unknown")
            
            # Remove from session connections
            if session_id and session_id in self.session_connections:
                self.session_connections[session_id].discard(websocket)
                
                # Clean up empty session sets
                if not self.session_connections[session_id]:
                    del self.session_connections[session_id]
                    
        except Exception as e:
            logger.error(f"Error during WebSocket disconnect cleanup: {e}")
            
        finally:
            # Always clean up all references to prevent memory leaks
            try:
                # Remove from user connections (guaranteed cleanup)
                self.user_connections.pop(websocket, None)
                
                # Remove metadata (guaranteed cleanup)
                self.connection_metadata.pop(websocket, None)
                
                logger.info(f"WebSocket disconnected - Session: {session_id}, User: {username}")
            except Exception as e:
                logger.error(f"Error in final WebSocket cleanup: {e}")
    
    async def send_to_connection(self, websocket: WebSocket, data: Dict[str, Any]):
        """Send data to a specific WebSocket connection"""
        try:
            await websocket.send_text(json.dumps(data))
        except Exception as e:
            logger.error(f"Error sending to WebSocket connection: {e}")
            # Connection might be closed, clean it up
            self.disconnect(websocket)
    
    async def send_to_session(self, session_id: str, data: Dict[str, Any]):
        """Send data to all connections for a specific session"""
        if session_id not in self.session_connections:
            logger.debug(f"No connections for session {session_id}")
            return
            
        # Add timestamp if not present
        if "timestamp" not in data:
            data["timestamp"] = datetime.now(timezone.utc).isoformat()
            
        connections_to_remove = []
        
        for websocket in self.session_connections[session_id].copy():
            try:
                await websocket.send_text(json.dumps(data))
            except Exception as e:
                logger.error(f"Error sending to session {session_id}: {e}")
                connections_to_remove.append(websocket)
        
        # Clean up failed connections
        for websocket in connections_to_remove:
            self.disconnect(websocket)
    
    async def broadcast_to_all(self, data: Dict[str, Any]):
        """Send data to all active connections"""
        if "timestamp" not in data:
            data["timestamp"] = datetime.now(timezone.utc).isoformat()
            
        connections_to_remove = []
        
        for websocket in self.user_connections.keys():
            try:
                await websocket.send_text(json.dumps(data))
            except Exception as e:
                logger.error(f"Error broadcasting: {e}")
                connections_to_remove.append(websocket)
        
        # Clean up failed connections
        for websocket in connections_to_remove:
            self.disconnect(websocket)
    
    def get_session_stats(self) -> Dict[str, Any]:
        """Get statistics about active connections"""
        return {
            "total_connections": len(self.user_connections),
            "active_sessions": len(self.session_connections),
            "sessions": {
                session_id: len(connections) 
                for session_id, connections in self.session_connections.items()
            }
        }
    
    def get_session_connections(self, session_id: str) -> List[Dict[str, Any]]:
        """Get connection info for a specific session"""
        if session_id not in self.session_connections:
            return []
            
        connections = []
        for websocket in self.session_connections[session_id]:
            metadata = self.connection_metadata.get(websocket, {})
            connections.append({
                "user": metadata.get("user", "unknown"),
                "connected_at": metadata.get("connected_at"),
                "is_admin": metadata.get("is_admin", False)
            })
        
        return connections


# Global connection manager instance
manager = ConnectionManager()


class ProcessingNotifier:
    """Handles processing-related WebSocket notifications"""
    
    def __init__(self, connection_manager: ConnectionManager):
        self.manager = connection_manager
    
    async def notify_processing_started(self, session_id: str, config: Dict[str, Any]):
        """Notify that processing has started"""
        await self.manager.send_to_session(session_id, {
            "type": "processing_started",
            "session_id": session_id,
            "config": config,
            "message": "Processing documents..."
        })
    
    async def notify_processing_progress(
        self, 
        session_id: str, 
        current: int, 
        total: int, 
        stage: str = "processing"
    ):
        """Notify about processing progress"""
        percentage = int((current / total) * 100) if total > 0 else 0
        
        await self.manager.send_to_session(session_id, {
            "type": "processing_progress",
            "session_id": session_id,
            "current": current,
            "total": total,
            "percentage": percentage,
            "stage": stage,
            "message": f"Processing {current}/{total} employees ({percentage}%)"
        })
    
    async def notify_processing_completed(
        self, 
        session_id: str, 
        summary: Dict[str, Any]
    ):
        """Notify that processing has completed"""
        await self.manager.send_to_session(session_id, {
            "type": "processing_completed",
            "session_id": session_id,
            "summary": summary,
            "message": "Document processing completed successfully"
        })
    
    async def notify_processing_failed(self, session_id: str, error: str):
        """Notify that processing has failed"""
        await self.manager.send_to_session(session_id, {
            "type": "processing_failed",
            "session_id": session_id,
            "error": error,
            "message": f"Processing failed: {error}"
        })
    
    async def notify_export_ready(
        self, 
        session_id: str, 
        export_type: str, 
        filename: str,
        download_url: str
    ):
        """Notify that an export is ready for download"""
        await self.manager.send_to_session(session_id, {
            "type": "export_ready",
            "session_id": session_id,
            "export_type": export_type,
            "filename": filename,
            "download_url": download_url,
            "message": f"{export_type} export ready for download"
        })
    
    async def notify_session_status_change(
        self, 
        session_id: str, 
        old_status: SessionStatus, 
        new_status: SessionStatus
    ):
        """Notify about session status changes"""
        await self.manager.send_to_session(session_id, {
            "type": "session_status_changed",
            "session_id": session_id,
            "old_status": old_status.value if old_status else None,
            "new_status": new_status.value,
            "message": f"Session status changed to {new_status.value}"
        })


# Global processing notifier
notifier = ProcessingNotifier(manager)


async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    user: UserInfo = Depends(get_current_user_ws),
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time session updates
    
    Args:
        websocket: WebSocket connection
        session_id: Session UUID to subscribe to
        user: Authenticated user
        db: Database session
    """
    try:
        # Validate session exists and user has access
        from uuid import UUID
        session_uuid = UUID(session_id)
        
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if not db_session:
            await websocket.close(code=4004, reason="Session not found")
            return
        
        # Check access permissions (same logic as other endpoints)
        if not user.is_admin:
            session_creator = db_session.created_by.lower()
            if '\\' in session_creator:
                session_creator = session_creator.split('\\')[1]
            
            if session_creator != user.username.lower():
                await websocket.close(code=4003, reason="Access denied")
                return
        
        # Connect to WebSocket
        await manager.connect(websocket, session_id, user)
        
        # Keep connection alive and handle messages
        try:
            while True:
                # Wait for messages from client
                data = await websocket.receive_text()
                
                try:
                    message = json.loads(data)
                    await handle_client_message(websocket, session_id, message, user, db)
                except json.JSONDecodeError:
                    await manager.send_to_connection(websocket, {
                        "type": "error",
                        "message": "Invalid JSON message"
                    })
                
        except WebSocketDisconnect:
            logger.info(f"WebSocket client disconnected: {session_id}")
        
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=4000, reason="Internal error")
    
    finally:
        manager.disconnect(websocket)


async def handle_client_message(
    websocket: WebSocket, 
    session_id: str, 
    message: Dict[str, Any],
    user: UserInfo,
    db: Session
):
    """Handle messages from WebSocket clients"""
    message_type = message.get("type")
    
    if message_type == "ping":
        # Respond to ping with pong
        await manager.send_to_connection(websocket, {
            "type": "pong",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    elif message_type == "request_status":
        # Send current session status
        from uuid import UUID
        session_uuid = UUID(session_id)
        
        db_session = db.query(ProcessingSession).filter(
            ProcessingSession.session_id == session_uuid
        ).first()
        
        if db_session:
            await manager.send_to_connection(websocket, {
                "type": "session_status",
                "session_id": session_id,
                "status": db_session.status.value,
                "total_employees": db_session.total_employees,
                "processed_employees": db_session.processed_employees
            })
    
    elif message_type == "request_stats":
        # Send connection statistics (admin only)
        if user.is_admin:
            stats = manager.get_session_stats()
            await manager.send_to_connection(websocket, {
                "type": "connection_stats",
                "stats": stats
            })
        else:
            await manager.send_to_connection(websocket, {
                "type": "error",
                "message": "Access denied"
            })
    
    else:
        await manager.send_to_connection(websocket, {
            "type": "error",
            "message": f"Unknown message type: {message_type}"
        })