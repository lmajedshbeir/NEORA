import logging
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth import get_user_model
from .models import AuditEvent

logger = logging.getLogger(__name__)
User = get_user_model()


class AuditMiddleware(MiddlewareMixin):
    """
    Middleware to capture request context for audit logging.
    """
    
    def process_request(self, request):
        # Store request context for use in views
        request.audit_context = {
            'ip': self.get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
        }
        return None
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    @staticmethod
    def log_event(user, event_type, request=None, metadata=None):
        """
        Log an audit event.
        
        Args:
            user: User instance or None
            event_type: String describing the event
            request: Django request object (optional)
            metadata: Additional data to store (optional)
        """
        try:
            audit_data = {
                'user': user,
                'event_type': event_type,
                'metadata': metadata or {}
            }
            
            if request and hasattr(request, 'audit_context'):
                audit_data.update({
                    'ip': request.audit_context['ip'],
                    'user_agent': request.audit_context['user_agent']
                })
            
            AuditEvent.objects.create(**audit_data)
            
            logger.info(f"Audit event logged: {event_type}", extra={
                'user_id': str(user.id) if user else None,
                'event_type': event_type,
                'metadata': metadata
            })
            
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}", extra={
                'event_type': event_type,
                'error': str(e)
            })

