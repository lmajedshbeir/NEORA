from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.urls import reverse
import logging

logger = logging.getLogger(__name__)


def send_verification_email(user, token):
    """
    Send email verification email to the user.
    
    Args:
        user: User instance
        token: Verification token
    """
    try:
        verification_url = f"{settings.FRONTEND_BASE_URL}/verify-email?token={token}"
        
        subject = "Verify your NEORA account"
        
        # Plain text message
        message = f"""
        Welcome to NEORA!
        
        Please verify your email address by clicking the link below:
        {verification_url}
        
        This link will expire in 1 hour.
        
        If you didn't create an account with NEORA, please ignore this email.
        
        Best regards,
        The NEORA Team
        """
        
        # HTML message (optional)
        html_message = f"""
        <html>
        <body>
            <h2>Welcome to NEORA!</h2>
            <p>Please verify your email address by clicking the button below:</p>
            <p>
                <a href="{verification_url}" 
                   style="background-color: #007bff; color: white; padding: 10px 20px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                    Verify Email
                </a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="{verification_url}">{verification_url}</a></p>
            <p><small>This link will expire in 1 hour.</small></p>
            <p>If you didn't create an account with NEORA, please ignore this email.</p>
            <hr>
            <p><small>Best regards,<br>The NEORA Team</small></p>
        </body>
        </html>
        """
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False
        )
        
        logger.info(f"Verification email sent to {user.email}")
        
    except Exception as e:
        logger.error(f"Failed to send verification email to {user.email}: {e}")
        raise


def send_password_reset_email(user, token):
    """
    Send password reset email to the user.
    
    Args:
        user: User instance
        token: Password reset token
    """
    try:
        reset_url = f"{settings.FRONTEND_BASE_URL}/reset-password?token={token}"
        
        subject = "Reset your NEORA password"
        
        # Plain text message
        message = f"""
        Hello {user.first_name or user.email},
        
        You requested to reset your password for your NEORA account.
        
        Please click the link below to reset your password:
        {reset_url}
        
        This link will expire in 1 hour.
        
        If you didn't request a password reset, please ignore this email.
        
        Best regards,
        The NEORA Team
        """
        
        # HTML message (optional)
        html_message = f"""
        <html>
        <body>
            <h2>Reset your NEORA password</h2>
            <p>Hello {user.first_name or user.email},</p>
            <p>You requested to reset your password for your NEORA account.</p>
            <p>Please click the button below to reset your password:</p>
            <p>
                <a href="{reset_url}" 
                   style="background-color: #dc3545; color: white; padding: 10px 20px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                    Reset Password
                </a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="{reset_url}">{reset_url}</a></p>
            <p><small>This link will expire in 1 hour.</small></p>
            <p>If you didn't request a password reset, please ignore this email.</p>
            <hr>
            <p><small>Best regards,<br>The NEORA Team</small></p>
        </body>
        </html>
        """
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False
        )
        
        logger.info(f"Password reset email sent to {user.email}")
        
    except Exception as e:
        logger.error(f"Failed to send password reset email to {user.email}: {e}")
        raise

