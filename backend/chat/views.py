from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import LimitOffsetPagination
from django.conf import settings
from django.utils.dateparse import parse_datetime
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import logging
import uuid
import os

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


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def messages_view(request):
    """Handle both listing and creating messages."""
    if request.method == 'GET':
        # List messages logic
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
        queryset = queryset.order_by('-created_at')[:limit]
        
        # Serialize and return
        serializer = MessageSerializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'count': len(serializer.data),
            'next': None,  # Simplified pagination
        })
    
    elif request.method == 'POST':
        # Create message logic with streaming
        serializer = MessageCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        message_text = serializer.validated_data['text']
        language = serializer.validated_data.get('language', 'en')
        
        try:
            # Create user message
            user_message = Message.objects.create(
                user=user,
                role='user',
                text=message_text,
                status='done'
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
                    locale=language,
                    timezone="Asia/Riyadh",
                    message_type="text"
                )
                
                # Simulate streaming response
                if channel_layer and CHANNELS_AVAILABLE:
                    logger.info(f"Starting streaming for user {user.id}, message {assistant_message.id}")
                    # Send streaming chunks
                    for chunk in simulate_streaming_response(reply_text):
                        logger.debug(f"Sending chunk: {chunk[:50]}...")
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
                    logger.info(f"Sending completion signal for message {assistant_message.id}")
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
                else:
                    logger.warning(f"Channel layer not available: channel_layer={channel_layer}, CHANNELS_AVAILABLE={CHANNELS_AVAILABLE}")
                
                # Update assistant message with final text
                assistant_message.text = reply_text
                assistant_message.status = 'done'
                assistant_message.save()
                
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


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_messages(request):
    """Clear all messages for the authenticated user."""
    try:
        user = request.user
        deleted_count, _ = Message.objects.filter(user=user).delete()
        
        logger.info(f"Cleared {deleted_count} messages for user {user.id}")
        
        return Response({
            'message': f'Successfully cleared {deleted_count} messages',
            'deleted_count': deleted_count
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error clearing messages: {e}")
        return Response({
            'error': 'Failed to clear messages. Please try again.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_voice(request):
    """Upload voice file and send to N8N workflow."""
    # Debug logging
    logger.info(f"Voice upload request received. Files: {list(request.FILES.keys())}")
    logger.info(f"Request data: {list(request.data.keys())}")
    
    if 'audio_file' in request.FILES:
        audio_file = request.FILES['audio_file']
        logger.info(f"Audio file details - Name: {audio_file.name}, Size: {audio_file.size}, Content-Type: {getattr(audio_file, 'content_type', 'unknown')}")
    
    serializer = VoiceUploadSerializer(data=request.data)
    
    if not serializer.is_valid():
        logger.error(f"Voice upload validation failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    user = request.user
    audio_file = serializer.validated_data['audio_file']
    language = serializer.validated_data.get('language', 'en')
    
    try:
        # Save audio file to media directory
        
        # Generate unique filename
        file_extension = audio_file.name.split('.')[-1] if '.' in audio_file.name else 'webm'
        filename = f"voice_messages/{user.id}/{uuid.uuid4()}.{file_extension}"
        
        # Save file directly without reading into memory to preserve audio quality
        logger.info(f"Saving audio file: {filename}, Original size: {audio_file.size}")
        saved_path = default_storage.save(filename, audio_file)
        audio_url = default_storage.url(saved_path)
        logger.info(f"Audio file saved successfully: {saved_path}, URL: {audio_url}")
        
        # Ensure we have a full URL, not just a relative path
        if audio_url.startswith('/'):
            audio_url = f"{request.scheme}://{request.get_host()}{audio_url}"
        
        # Create user message with voice file
        user_message = Message.objects.create(
            user=user,
            role='user',
            text='[Voice Message]',
            audio_url=audio_url,
            status='done'
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
            # Call n8n workflow with voice file
            assistant_message.status = 'sent'
            assistant_message.save()
            
            # Send the audio file directly as multipart/form-data to N8N
            # Reset file pointer to beginning in case it was read elsewhere
            audio_file.seek(0)
            
            reply_text = post_to_workflow(
                user_id=str(user.id),
                message="",  # Empty message for voice files
                locale=language,
                timezone="Asia/Riyadh",
                message_type="voice",
                audio_file=audio_file  # Pass the file object directly
            )
            
            # Simulate streaming response
            if channel_layer and CHANNELS_AVAILABLE:
                logger.info(f"Starting streaming for user {user.id}, message {assistant_message.id}")
                # Send streaming chunks
                for chunk in simulate_streaming_response(reply_text):
                    logger.debug(f"Sending chunk: {chunk[:50]}...")
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
                logger.info(f"Sending completion signal for message {assistant_message.id}")
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
            else:
                logger.warning(f"Channel layer not available: channel_layer={channel_layer}, CHANNELS_AVAILABLE={CHANNELS_AVAILABLE}")
            
            # Update assistant message with final text
            assistant_message.text = reply_text
            assistant_message.status = 'done'
            assistant_message.save()
            
        except Exception as e:
            logger.error(f"Error getting assistant response: {e}")
            
            # Mark message as error and send error via WebSocket
            assistant_message.status = 'error'
            assistant_message.text = 'I apologize, but I encountered an error processing your voice message. Please try again.'
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
        
        # Return both messages
        return Response({
            'user_message': MessageSerializer(user_message).data,
            'assistant_message': MessageSerializer(assistant_message).data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error creating voice message: {e}")
        return Response({
            'error': 'Failed to process voice message. Please try again.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
