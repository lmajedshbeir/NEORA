from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import LimitOffsetPagination
from django.conf import settings
from django.utils.dateparse import parse_datetime
import logging
import uuid

from .models import Message
from .serializers import MessageSerializer, MessageCreateSerializer, VoiceUploadSerializer
from .services.n8n_client import post_to_workflow, simulate_streaming_response
from audit.middleware import AuditMiddleware

logger = logging.getLogger(__name__)

# Import channel layer with fallback
try:
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    CHANNELS_AVAILABLE = True
except ImportError:
    CHANNELS_AVAILABLE = False
    get_channel_layer = None
    async_to_sync = None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_messages(request):
    """List user's messages with pagination."""
    user = request.user
    
    # Get query parameters
    limit = int(request.GET.get('limit', 50))
    before = request.GET.get('before')  # ISO datetime string
    
    # Build queryset
    queryset = Message.objects.filter(user=user)
    
    if before:
        try:
            before_dt = parse_datetime(before)
            if before_dt:
                queryset = queryset.filter(created_at__lt=before_dt)
        except ValueError:
            pass
    
    # Apply pagination
    paginator = LimitOffsetPagination()
    paginator.default_limit = limit
    paginated_messages = paginator.paginate_queryset(queryset, request)
    
    serializer = MessageSerializer(paginated_messages, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_message(request):
    """Create a new message and get assistant response."""
    serializer = MessageCreateSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    user = request.user
    message_text = serializer.validated_data['text']
    
    try:
        # Create user message
        user_message = Message.objects.create(
            user=user,
            role='user',
            text=message_text,
            status='done'
        )
        
        # Log audit event
        AuditMiddleware.log_event(
            user=user,
            event_type='message_sent',
            request=request,
            metadata={'message_id': str(user_message.id), 'text_length': len(message_text)}
        )
        
        # Create assistant message placeholder
        assistant_message = Message.objects.create(
            user=user,
            role='assistant',
            text='',
            status='queued'
        )
        
        # Get user's channel for WebSocket streaming
        channel_layer = get_channel_layer() if CHANNELS_AVAILABLE else None
        user_channel = f"user_{user.id}"
        
        try:
            # Call n8n workflow
            assistant_message.status = 'sent'
            assistant_message.save()
            
            reply_text = post_to_workflow(
                user_id=str(user.id),
                message=message_text,
                locale=user.preferred_language,
                timezone=settings.TIME_ZONE
            )
            
            # Simulate streaming response
            if channel_layer and CHANNELS_AVAILABLE:
                # Send streaming chunks
                for chunk in simulate_streaming_response(reply_text):
                    async_to_sync(channel_layer.group_send)(
                        user_channel,
                        {
                            'type': 'stream_message',
                            'message': {
                                'type': 'delta',
                                'data': chunk,
                                'message_id': str(assistant_message.id)
                            }
                        }
                    )
                
                # Send completion signal
                async_to_sync(channel_layer.group_send)(
                    user_channel,
                    {
                        'type': 'stream_message',
                        'message': {
                            'type': 'done',
                            'message_id': str(assistant_message.id)
                        }
                    }
                )
            
            # Update assistant message with final text
            assistant_message.text = reply_text
            assistant_message.status = 'done'
            assistant_message.save()
            
            # Log audit event
            AuditMiddleware.log_event(
                user=user,
                event_type='assistant_response_received',
                request=request,
                metadata={
                    'message_id': str(assistant_message.id),
                    'response_length': len(reply_text)
                }
            )
            
        except Exception as e:
            logger.error(f"Error getting assistant response: {e}")
            
            # Mark message as error and send error via WebSocket
            assistant_message.status = 'error'
            assistant_message.text = 'I apologize, but I encountered an error processing your request. Please try again.'
            assistant_message.save()
            
            if channel_layer and CHANNELS_AVAILABLE:
                async_to_sync(channel_layer.group_send)(
                    user_channel,
                    {
                        'type': 'stream_message',
                        'message': {
                            'type': 'error',
                            'code': 'assistant_error',
                            'message': 'Failed to get assistant response',
                            'message_id': str(assistant_message.id)
                        }
                    }
                )
            
            # Log audit event
            AuditMiddleware.log_event(
                user=user,
                event_type='assistant_response_error',
                request=request,
                metadata={
                    'message_id': str(assistant_message.id),
                    'error': str(e)
                }
            )
        
        # Return both messages
        return Response({
            'user_message': MessageSerializer(user_message).data,
            'assistant_message': MessageSerializer(assistant_message).data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error creating message: {e}")
        return Response({
            'error': 'Failed to create message. Please try again.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_voice(request):
    """Upload voice file for transcription (fallback when Web Speech API is not available)."""
    if not settings.ENABLE_TRANSCRIPTION:
        return Response({
            'error': 'Voice transcription is not enabled on this server.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = VoiceUploadSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # For now, return a placeholder response
    # In a real implementation, you would:
    # 1. Save the audio file
    # 2. Send it to a transcription service (e.g., OpenAI Whisper, Google Speech-to-Text)
    # 3. Return the transcribed text
    # 4. Optionally create a message with the transcribed text
    
    return Response({
        'error': 'Voice transcription is not implemented yet. Please use text input.'
    }, status=status.HTTP_501_NOT_IMPLEMENTED)
