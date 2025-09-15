from django.db import models
from django.conf import settings
import uuid


class AuditEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    event_type = models.CharField(max_length=100)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["event_type"]),
            models.Index(fields=["user", "created_at"])
        ]
        ordering = ["-created_at"]
    
    def __str__(self):
        user_email = self.user.email if self.user else "Anonymous"
        return f"{user_email} - {self.event_type} at {self.created_at}"
