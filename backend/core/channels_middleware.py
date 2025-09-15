from __future__ import annotations

import typing as _t
from urllib.parse import parse_qs

from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async


@database_sync_to_async
def _get_user_by_id(user_id: int):
    from django.contrib.auth.models import AnonymousUser
    from django.contrib.auth import get_user_model
    
    UserModel = get_user_model()
    try:
        return UserModel.objects.get(id=user_id)
    except UserModel.DoesNotExist:
        return AnonymousUser()


@sync_to_async
def _validate_access_token(token_str: str):
    """Validate access token and return user_id if valid."""
    from rest_framework_simplejwt.tokens import AccessToken
    from rest_framework_simplejwt.exceptions import TokenError
    
    try:
        token = AccessToken(token_str)
        return token.get("user_id")
    except TokenError:
        return None


@sync_to_async
def _validate_refresh_token(token_str: str):
    """Validate refresh token and return new access token user_id if valid."""
    from rest_framework_simplejwt.tokens import RefreshToken
    from rest_framework_simplejwt.exceptions import TokenError
    
    try:
        refresh_token = RefreshToken(token_str)
        new_access_token = refresh_token.access_token
        return new_access_token.get("user_id")
    except TokenError:
        return None


class CookieJWTAuthMiddleware(BaseMiddleware):
    """Channels middleware that authenticates via JWT in the access_token cookie.

    Falls back to querystring `token` for convenience during local development.
    Also handles refresh_token to automatically get access_token.
    """

    async def __call__(self, scope, receive, send):  # type: ignore[override]
        from django.contrib.auth.models import AnonymousUser
        import logging
        
        logger = logging.getLogger(__name__)
        user = AnonymousUser()

        try:
            # Debug logging
            logger.info(f"WebSocket middleware - scope headers: {dict(scope.get('headers', []))}")
            logger.info(f"WebSocket middleware - query string: {scope.get('query_string', b'').decode('utf-8')}")
            # 1) Try cookie
            headers = dict(scope.get("headers", []))
            cookie_header = headers.get(b"cookie")
            access_token_str: str | None = None
            refresh_token_str: str | None = None
            
            if cookie_header:
                cookie_text = cookie_header.decode("latin-1")
                # simple cookie parse
                for part in cookie_text.split("; "):
                    if part.startswith("access_token="):
                        access_token_str = part[len("access_token=") :]
                    elif part.startswith("refresh_token="):
                        refresh_token_str = part[len("refresh_token=") :]

            # 2) Fallback to querystring ?token=
            if not access_token_str:
                qs = parse_qs(scope.get("query_string", b"").decode("utf-8"))
                token_vals = qs.get("token")
                if token_vals:
                    access_token_str = token_vals[0]

            # 3) Try to use access token
            if access_token_str:
                user_id = await _validate_access_token(access_token_str)
                if user_id is not None:
                    user = await _get_user_by_id(user_id)
            
            # 4) If no access token but have refresh token, try to refresh
            elif refresh_token_str:
                logger.info(f"WebSocket middleware - trying refresh token: {refresh_token_str[:20]}...")
                user_id = await _validate_refresh_token(refresh_token_str)
                if user_id is not None:
                    user = await _get_user_by_id(user_id)
                    logger.info(f"WebSocket middleware - authenticated user: {user.email if hasattr(user, 'email') else 'Unknown'}")
                    
        except Exception as e:
            # On any failure, remain Anonymous
            logger.error(f"WebSocket middleware - exception: {e}")
            from django.contrib.auth.models import AnonymousUser
            user = AnonymousUser()

        logger.info(f"WebSocket middleware - final user: {user.email if hasattr(user, 'email') else 'Anonymous'}")
        scope["user"] = user
        return await super().__call__(scope, receive, send)


