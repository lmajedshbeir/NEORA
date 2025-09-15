import json
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)
User = get_user_model()


class StreamConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for streaming assistant responses to authenticated users.
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        user = self.scope.get("user")
        
        # Debug logging
        logger.info(f"WebSocket connection attempt - user: {user}, authenticated: {user.is_authenticated if user else False}")
        logger.info(f"WebSocket scope headers: {dict(self.scope.get('headers', []))}")
        logger.info(f"WebSocket query string: {self.scope.get('query_string', b'').decode('utf-8')}")
        
        # For now, accept all connections to avoid blocking the app
        # TODO: Implement proper JWT authentication for WebSocket
        await self.accept()
        
        if user and user.is_authenticated:
            # Join user-specific group
            self.user_group = f"user_{user.id}"
            await self.channel_layer.group_add(
                self.user_group,
                self.channel_name
            )
            
            logger.info(f"WebSocket connected for user {user.email}")
            
            # Send connection confirmation
            await self.send_json({
                "type": "connection",
                "status": "connected",
                "message": "WebSocket connection established"
            })
        else:
            # Accept connection but don't join user group
            logger.info("WebSocket connected for anonymous user")
            await self.send_json({
                "type": "connection",
                "status": "connected",
                "message": "WebSocket connection established (anonymous)"
            })
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        user = self.scope.get("user")
        
        if user and user.is_authenticated:
            # Leave user-specific group
            await self.channel_layer.group_discard(
                self.user_group,
                self.channel_name
            )
            
            logger.info(f"WebSocket disconnected for user {user.email}, close_code: {close_code}")
    
    async def receive_json(self, content):
        """
        Handle incoming WebSocket messages.
        Currently, this consumer is primarily for receiving server-side events,
        but we can handle client messages if needed.
        """
        user = self.scope.get("user")
        message_type = content.get("type")
        
        logger.debug(f"Received WebSocket message from {user.email}: {message_type}")
        
        # Handle different message types
        if message_type == "ping":
            await self.send_json({
                "type": "pong",
                "timestamp": content.get("timestamp")
            })
        
        elif message_type == "subscribe":
            # Client can subscribe to specific events if needed
            await self.send_json({
                "type": "subscribed",
                "message": "Subscribed to assistant responses"
            })
        
        else:
            # Unknown message type
            await self.send_json({
                "type": "error",
                "message": f"Unknown message type: {message_type}"
            })
    
    async def stream_message(self, event):
        """
        Handle streaming messages from the channel layer.
        This is called when the backend sends streaming data.
        """
        message = event["message"]
        
        # Forward the message to the WebSocket client
        await self.send_json(message)
        
        logger.debug(f"Streamed message to client: {message.get('type')}")
    
    async def message_update(self, event):
        """
        Handle message updates from the channel layer.
        This is called when a new message is created.
        """
        message = event["message"]
        
        # Forward the message to the WebSocket client
        await self.send_json({
            "type": "message_update",
            "data": message
        })
        
        logger.debug(f"Sent message update to client: {message.get('id')}")


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    Alternative WebSocket consumer for real-time chat functionality.
    This could be used for more interactive features in the future.
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        user = self.scope.get("user")
        
        if user and user.is_authenticated:
            # Join user-specific room
            self.room_name = f"chat_{user.id}"
            self.room_group_name = f"chat_group_{user.id}"
            
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            await self.accept()
            
            logger.info(f"Chat WebSocket connected for user {user.email}")
            
        else:
            await self.close(code=4001)
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        user = self.scope.get("user")
        
        if user and user.is_authenticated:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            
            logger.info(f"Chat WebSocket disconnected for user {user.email}")
    
    async def receive_json(self, content):
        """Handle incoming chat messages."""
        user = self.scope.get("user")
        message_type = content.get("type")
        
        if message_type == "chat_message":
            # Handle real-time chat messages
            message_text = content.get("message", "")
            
            # Echo the message back (or process it)
            await self.send_json({
                "type": "chat_message",
                "message": message_text,
                "user": user.email,
                "timestamp": content.get("timestamp")
            })
    
    async def chat_message(self, event):
        """Send chat message to WebSocket."""
        await self.send_json(event["message"])

