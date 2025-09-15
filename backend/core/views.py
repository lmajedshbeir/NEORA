from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db import transaction
import logging

from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    EmailVerificationSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer
)
from .tokens import (
    generate_email_verification_token,
    verify_email_verification_token,
    generate_password_reset_token,
    verify_password_reset_token
)
from .emails import send_verification_email, send_password_reset_email


from audit.middleware import AuditMiddleware
from django.conf import settings


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Simple health check endpoint"""
    from django.db import connection
    from django.conf import settings
    
    # Test database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    # Test Redis connection
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        redis_status = "connected"
    except Exception as e:
        redis_status = f"error: {str(e)}"
    
    return Response({
        'status': 'healthy',
        'message': 'Backend is running properly',
        'database': db_status,
        'redis': redis_status,
        'debug_mode': settings.DEBUG
    })

logger = logging.getLogger(__name__)
User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new user account."""
    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        try:
            with transaction.atomic():
                user = serializer.save()
                
                # Generate verification token and send email
                token = generate_email_verification_token(user)
                send_verification_email(user, token)
                
                # Log audit event
                AuditMiddleware.log_event(
                    user=user,
                    event_type='user_registered',
                    request=request,
                    metadata={'email': user.email}
                )
                
                return Response({
                    'message': 'Registration successful. Please check your email to verify your account.',
                    'email': user.email
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Registration failed: {e}")
            return Response({
                'error': 'Registration failed. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    """Verify user email address."""
    serializer = EmailVerificationSerializer(data=request.data)
    
    if serializer.is_valid():
        token = serializer.validated_data['token']
        user = verify_email_verification_token(token)
        
        if user:
            if user.is_email_verified:
                return Response({
                    'message': 'Email already verified.'
                }, status=status.HTTP_200_OK)
            
            user.is_email_verified = True
            user.is_active = True
            user.save()
            
            # Log audit event
            AuditMiddleware.log_event(
                user=user,
                event_type='email_verified',
                request=request
            )
            
            return Response({
                'message': 'Email verified successfully. You can now log in.'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Invalid or expired verification token.'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def verify_email_redirect(request):
    """Handle email verification via GET request and redirect to frontend."""
    from django.shortcuts import redirect
    from django.conf import settings
    
    token = request.GET.get('token')
    if not token:
        return redirect(f"{settings.FRONTEND_BASE_URL}/login?error=no_token")
    
    # Verify the token
    user = verify_email_verification_token(token)
    
    if user:
        if user.is_email_verified:
            return redirect(f"{settings.FRONTEND_BASE_URL}/login?message=already_verified")
        
        user.is_email_verified = True
        user.is_active = True
        user.save()
        
        # Log audit event
        AuditMiddleware.log_event(
            user=user,
            event_type='email_verified',
            request=request
        )
        
        return redirect(f"{settings.FRONTEND_BASE_URL}/login?message=verified_success")
    else:
        return redirect(f"{settings.FRONTEND_BASE_URL}/login?error=invalid_token")


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """User login."""
    serializer = UserLoginSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        # Create response with tokens in cookies
        response = Response({
            'message': 'Login successful.',
            'user': UserProfileSerializer(user).data
        }, status=status.HTTP_200_OK)
        
        # Set HTTP-only cookies with proper settings for production
        response.set_cookie(
            'access_token',
            str(access_token),
            max_age=60 * 10,  # 10 minutes
            httponly=True,
            secure=not settings.DEBUG,  # Secure in production
            samesite='Lax',
            domain=None,  # Let browser handle domain
            path='/'
        )
        
        response.set_cookie(
            'refresh_token',
            str(refresh),
            max_age=60 * 60 * 24 * 14,  # 14 days
            httponly=True,
            secure=not settings.DEBUG,  # Secure in production
            samesite='Lax',
            domain=None,  # Let browser handle domain
            path='/'
        )
        
        # Log audit event
        AuditMiddleware.log_event(
            user=user,
            event_type='user_login',
            request=request
        )
        
        return response
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """User logout."""
    try:
        # Get refresh token from cookie
        refresh_token = request.COOKIES.get('refresh_token')
        
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        
        # Create response and clear cookies
        response = Response({
            'message': 'Logout successful.'
        }, status=status.HTTP_200_OK)
        
        response.delete_cookie('access_token')
        response.delete_cookie('refresh_token')
        
        # Log audit event
        AuditMiddleware.log_event(
            user=request.user,
            event_type='user_logout',
            request=request
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return Response({
            'error': 'Logout failed.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """Refresh JWT tokens."""
    refresh_token = request.COOKIES.get('refresh_token')
    
    if not refresh_token:
        return Response({
            'error': 'Refresh token not found.'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        refresh = RefreshToken(refresh_token)
        access_token = refresh.access_token
        
        # Create response with new access token
        response = Response({
            'message': 'Token refreshed successfully.'
        }, status=status.HTTP_200_OK)
        
        response.set_cookie(
            'access_token',
            str(access_token),
            max_age=60 * 10,  # 10 minutes
            httponly=True,
            secure=not settings.DEBUG,  # Secure in production
            samesite='Lax',
            domain=None,  # Let browser handle domain
            path='/'
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        return Response({
            'error': 'Invalid refresh token.'
        }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile(request):
    """Get or update user profile."""
    if request.method == 'GET':
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
    elif request.method == 'PATCH':
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            
            # Log audit event
            AuditMiddleware.log_event(
                user=request.user,
                event_type='profile_updated',
                request=request,
                metadata=request.data
            )
            
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """Request password reset."""
    serializer = PasswordResetRequestSerializer(data=request.data)
    
    if serializer.is_valid():
        email = serializer.validated_data['email']
        
        try:
            user = User.objects.get(email=email, is_active=True)
            
            # Generate reset token and send email
            token = generate_password_reset_token(user)
            send_password_reset_email(user, token)
            
            # Log audit event
            AuditMiddleware.log_event(
                user=user,
                event_type='password_reset_requested',
                request=request
            )
            
        except User.DoesNotExist:
            # Don't reveal if email exists or not
            pass
        
        return Response({
            'message': 'If an account with that email exists, a password reset link has been sent.'
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """Reset password with token."""
    serializer = PasswordResetConfirmSerializer(data=request.data)
    
    if serializer.is_valid():
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']
        
        user = verify_password_reset_token(token)
        
        if user:
            user.set_password(new_password)
            user.save()
            
            # Log audit event
            AuditMiddleware.log_event(
                user=user,
                event_type='password_reset_completed',
                request=request
            )
            
            return Response({
                'message': 'Password reset successfully.'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Invalid or expired reset token.'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
