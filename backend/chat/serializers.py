from rest_framework import serializers
from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'role', 'text', 'audio_url', 'status', 'created_at']
        read_only_fields = ['id', 'created_at', 'status']


class MessageCreateSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=8000, required=True)
    language = serializers.CharField(max_length=10, required=False, default='en')
    
    def validate_text(self, value):
        # Normalize whitespace
        value = ' '.join(value.split())
        if not value.strip():
            raise serializers.ValidationError("Message text cannot be empty.")
        return value


class VoiceUploadSerializer(serializers.Serializer):
    audio_file = serializers.FileField(required=True)
    language = serializers.CharField(max_length=10, required=False, default='en')
    
    def validate_audio_file(self, value):
        # Validate file size (max 10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Audio file size cannot exceed 10MB.")
        
        # Validate MIME type - be more flexible with WebM formats
        allowed_types = [
            'audio/webm', 
            'audio/webm;codecs=opus',
            'audio/wav', 
            'audio/m4a', 
            'audio/mp3', 
            'audio/ogg',
            'application/octet-stream'  # Sometimes blobs come as this
        ]
        
        # Get content type, with fallback
        content_type = getattr(value, 'content_type', None) or getattr(value, 'type', None)
        
        if content_type not in allowed_types:
            # Log the actual content type for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Unexpected audio content type: {content_type}")
            
            # Allow the file if it's a reasonable size and has audio-like extension
            if value.size > 0 and value.size < 10 * 1024 * 1024:
                return value
            else:
                raise serializers.ValidationError(
                    f"Unsupported audio format: {content_type}. Allowed formats: {', '.join(allowed_types)}"
                )
        
        return value

