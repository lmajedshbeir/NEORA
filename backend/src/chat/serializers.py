from rest_framework import serializers
from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'role', 'text', 'audio_url', 'status', 'created_at']
        read_only_fields = ['id', 'created_at', 'status']


class MessageCreateSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=8000, required=True)
    
    def validate_text(self, value):
        # Normalize whitespace
        value = ' '.join(value.split())
        if not value.strip():
            raise serializers.ValidationError("Message text cannot be empty.")
        return value


class VoiceUploadSerializer(serializers.Serializer):
    audio_file = serializers.FileField(required=True)
    
    def validate_audio_file(self, value):
        # Validate file size (max 10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Audio file size cannot exceed 10MB.")
        
        # Validate MIME type
        allowed_types = ['audio/webm', 'audio/wav', 'audio/m4a', 'audio/mp3', 'audio/ogg']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                f"Unsupported audio format. Allowed formats: {', '.join(allowed_types)}"
            )
        
        return value

