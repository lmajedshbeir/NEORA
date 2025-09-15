from django.db import models
from django.conf import settings
import uuid


class Message(models.Model):
    ROLE_CHOICES = [
        ("user", "User"),
        ("assistant", "Assistant")
    ]
    STATUS_CHOICES = [
        ("queued", "Queued"),
        ("sent", "Sent"),
        ("error", "Error"),
        ("done", "Done")
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="messages"
    )
    role = models.CharField(max_length=16, choices=ROLE_CHOICES)
    text = models.TextField(max_length=8000)
    audio_url = models.URLField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="done")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "created_at"])
        ]
        ordering = ["created_at"]
    
    def __str__(self):
        return f"{self.user.email} - {self.role}: {self.text[:50]}..."
