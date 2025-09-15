from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Token expiry times (in seconds)
EMAIL_VERIFICATION_TIMEOUT = 3600  # 1 hour
PASSWORD_RESET_TIMEOUT = 3600      # 1 hour


class TokenGenerator:
    """
    Generate and verify signed tokens for email verification and password reset.
    """
    
    def __init__(self, salt):
        self.salt = salt
        self.signer = TimestampSigner(salt=salt)
    
    def make_token(self, user_id):
        """Generate a signed token for the user."""
        return self.signer.sign(str(user_id))
    
    def verify_token(self, token, max_age):
        """
        Verify a signed token and return the user ID.
        
        Returns:
            str: User ID if token is valid
            None: If token is invalid or expired
        """
        try:
            user_id = self.signer.unsign(token, max_age=max_age)
            return user_id
        except (BadSignature, SignatureExpired) as e:
            logger.warning(f"Token verification failed: {e}")
            return None


# Token generators for different purposes
email_verification_token = TokenGenerator('email_verification')
password_reset_token = TokenGenerator('password_reset')


def generate_email_verification_token(user):
    """Generate an email verification token for the user."""
    return email_verification_token.make_token(user.id)


def verify_email_verification_token(token):
    """
    Verify an email verification token.
    
    Returns:
        User: User instance if token is valid
        None: If token is invalid or expired
    """
    from .models import User
    
    user_id = email_verification_token.verify_token(token, EMAIL_VERIFICATION_TIMEOUT)
    if user_id:
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.warning(f"User {user_id} not found for email verification token")
    return None


def generate_password_reset_token(user):
    """Generate a password reset token for the user."""
    return password_reset_token.make_token(user.id)


def verify_password_reset_token(token):
    """
    Verify a password reset token.
    
    Returns:
        User: User instance if token is valid
        None: If token is invalid or expired
    """
    from .models import User
    
    user_id = password_reset_token.verify_token(token, PASSWORD_RESET_TIMEOUT)
    if user_id:
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.warning(f"User {user_id} not found for password reset token")
    return None

