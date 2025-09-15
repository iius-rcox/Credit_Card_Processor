"""
WebSocket Support for Bulk Operations
Handles real-time notifications for bulk actions
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import asyncio
import json
from fastapi import WebSocket, WebSocketDisconnect
from collections import defaultdict

from .logging_config import get_logger

logger = get_logger(__name__)

class BulkOperationWebSocketManager:
    """Manager for WebSocket connections handling bulk operations"""
    
    def __init__(self):
        # Store active connections by user ID
        self.active_connections: Dict[str, List[WebSocket]] = defaultdict(list)
        
        # Store operation subscriptions
        self.operation_subscriptions: Dict[str, List[str]] = defaultdict(list)
        
        # Operation progress tracking
        self.operation_progress: Dict[str, Dict[str, Any]] = {}
        
        # Message queue for reliability
        self.message_queue: Dict[str, List[Dict]] = defaultdict(list)
        
    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected for user: {user_id}")
        
        # Send any queued messages
        if user_id in self.message_queue:
            for message in self.message_queue[user_id]:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send queued message: {str(e)}")
            self.message_queue[user_id].clear()
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a WebSocket connection"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
                
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                
        logger.info(f"WebSocket disconnected for user: {user_id}")
    
    async def subscribe_to_operation(self, operation_id: str, user_id: str):
        """Subscribe a user to operation updates"""
        self.operation_subscriptions[operation_id].append(user_id)
        
        # Send current progress if available
        if operation_id in self.operation_progress:
            await self.send_operation_update(
                operation_id,
                self.operation_progress[operation_id],
                [user_id]
            )
    
    def unsubscribe_from_operation(self, operation_id: str, user_id: str):
        """Unsubscribe a user from operation updates"""
        if operation_id in self.operation_subscriptions:
            if user_id in self.operation_subscriptions[operation_id]:
                self.operation_subscriptions[operation_id].remove(user_id)
                
            if not self.operation_subscriptions[operation_id]:
                del self.operation_subscriptions[operation_id]
    
    async def send_personal_message(self, user_id: str, message: Dict[str, Any]):
        """Send a message to a specific user"""
        if user_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except WebSocketDisconnect:
                    disconnected.append(connection)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {str(e)}")
                    disconnected.append(connection)
            
            # Clean up disconnected connections
            for conn in disconnected:
                self.disconnect(conn, user_id)
        else:
            # Queue message for when user reconnects
            self.message_queue[user_id].append(message)
    
    async def broadcast(self, message: Dict[str, Any], exclude_users: Optional[List[str]] = None):
        """Broadcast a message to all connected users"""
        exclude_users = exclude_users or []
        
        for user_id, connections in self.active_connections.items():
            if user_id not in exclude_users:
                await self.send_personal_message(user_id, message)
    
    async def notify_bulk_operation_started(
        self,
        operation_id: str,
        action: str,
        total_count: int,
        user_id: str
    ):
        """Notify that a bulk operation has started"""
        message = {
            'type': 'bulk_operation_started',
            'operation_id': operation_id,
            'action': action,
            'total_count': total_count,
            'started_at': datetime.utcnow().isoformat(),
            'progress': 0
        }
        
        # Track operation progress
        self.operation_progress[operation_id] = {
            'action': action,
            'total_count': total_count,
            'processed_count': 0,
            'progress': 0,
            'status': 'IN_PROGRESS',
            'started_at': datetime.utcnow().isoformat()
        }
        
        # Subscribe user to this operation
        await self.subscribe_to_operation(operation_id, user_id)
        
        # Send notification
        await self.send_personal_message(user_id, message)
    
    async def notify_bulk_operation_progress(
        self,
        operation_id: str,
        processed_count: int,
        total_count: int,
        current_item: Optional[str] = None
    ):
        """Notify progress of a bulk operation"""
        progress = (processed_count / total_count * 100) if total_count > 0 else 0
        
        message = {
            'type': 'bulk_operation_progress',
            'operation_id': operation_id,
            'processed_count': processed_count,
            'total_count': total_count,
            'progress': round(progress, 2),
            'current_item': current_item,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Update tracked progress
        if operation_id in self.operation_progress:
            self.operation_progress[operation_id].update({
                'processed_count': processed_count,
                'progress': round(progress, 2)
            })
        
        # Send to subscribed users
        await self.send_operation_update(operation_id, message)
    
    async def notify_bulk_operation_completed(
        self,
        operation_id: str,
        action: str,
        result: Dict[str, Any]
    ):
        """Notify that a bulk operation has completed"""
        message = {
            'type': 'bulk_operation_completed',
            'operation_id': operation_id,
            'action': action,
            'result': result,
            'completed_at': datetime.utcnow().isoformat()
        }
        
        # Update tracked progress
        if operation_id in self.operation_progress:
            self.operation_progress[operation_id].update({
                'status': 'COMPLETED',
                'completed_at': datetime.utcnow().isoformat(),
                'result': result
            })
        
        # Send to subscribed users
        await self.send_operation_update(operation_id, message)
        
        # Clean up after a delay
        asyncio.create_task(self._cleanup_operation(operation_id, delay=60))
    
    async def notify_bulk_operation_failed(
        self,
        operation_id: str,
        action: str,
        error: str,
        partial_result: Optional[Dict[str, Any]] = None
    ):
        """Notify that a bulk operation has failed"""
        message = {
            'type': 'bulk_operation_failed',
            'operation_id': operation_id,
            'action': action,
            'error': error,
            'partial_result': partial_result,
            'failed_at': datetime.utcnow().isoformat()
        }
        
        # Update tracked progress
        if operation_id in self.operation_progress:
            self.operation_progress[operation_id].update({
                'status': 'FAILED',
                'error': error,
                'failed_at': datetime.utcnow().isoformat()
            })
        
        # Send to subscribed users
        await self.send_operation_update(operation_id, message)
        
        # Clean up after a delay
        asyncio.create_task(self._cleanup_operation(operation_id, delay=60))
    
    async def notify_selection_validation(
        self,
        user_id: str,
        validation_result: Dict[str, Any]
    ):
        """Notify user of selection validation results"""
        message = {
            'type': 'selection_validation',
            'validation': validation_result,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        await self.send_personal_message(user_id, message)
    
    async def notify_sessions_updated(
        self,
        session_ids: List[str],
        update_type: str,
        details: Optional[Dict[str, Any]] = None
    ):
        """Notify all users that sessions have been updated"""
        message = {
            'type': 'sessions_updated',
            'session_ids': session_ids,
            'update_type': update_type,  # 'deleted', 'closed', 'archived', etc.
            'details': details,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        await self.broadcast(message)
    
    async def send_operation_update(
        self,
        operation_id: str,
        message: Dict[str, Any],
        specific_users: Optional[List[str]] = None
    ):
        """Send update to users subscribed to an operation"""
        users_to_notify = specific_users or self.operation_subscriptions.get(operation_id, [])
        
        for user_id in users_to_notify:
            await self.send_personal_message(user_id, message)
    
    async def _cleanup_operation(self, operation_id: str, delay: int = 60):
        """Clean up operation data after a delay"""
        await asyncio.sleep(delay)
        
        if operation_id in self.operation_progress:
            del self.operation_progress[operation_id]
            
        if operation_id in self.operation_subscriptions:
            del self.operation_subscriptions[operation_id]
    
    def get_operation_status(self, operation_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of an operation"""
        return self.operation_progress.get(operation_id)
    
    def get_user_operations(self, user_id: str) -> List[str]:
        """Get all operations a user is subscribed to"""
        operations = []
        for op_id, users in self.operation_subscriptions.items():
            if user_id in users:
                operations.append(op_id)
        return operations
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get statistics about WebSocket connections"""
        total_connections = sum(len(conns) for conns in self.active_connections.values())
        
        return {
            'total_users': len(self.active_connections),
            'total_connections': total_connections,
            'active_operations': len(self.operation_progress),
            'queued_messages': sum(len(msgs) for msgs in self.message_queue.values())
        }

# Create singleton instance
bulk_ws_manager = BulkOperationWebSocketManager()

# WebSocket endpoint handler
async def websocket_bulk_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for bulk operations"""
    await bulk_ws_manager.connect(websocket, user_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            # Handle different message types
            if data.get('type') == 'subscribe':
                operation_id = data.get('operation_id')
                if operation_id:
                    await bulk_ws_manager.subscribe_to_operation(operation_id, user_id)
                    
            elif data.get('type') == 'unsubscribe':
                operation_id = data.get('operation_id')
                if operation_id:
                    bulk_ws_manager.unsubscribe_from_operation(operation_id, user_id)
                    
            elif data.get('type') == 'get_status':
                operation_id = data.get('operation_id')
                if operation_id:
                    status = bulk_ws_manager.get_operation_status(operation_id)
                    await websocket.send_json({
                        'type': 'operation_status',
                        'operation_id': operation_id,
                        'status': status
                    })
                    
            elif data.get('type') == 'ping':
                await websocket.send_json({'type': 'pong'})
                
    except WebSocketDisconnect:
        bulk_ws_manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {str(e)}")
        bulk_ws_manager.disconnect(websocket, user_id)