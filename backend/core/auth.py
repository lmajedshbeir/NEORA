from typing import Optional, Tuple
from rest_framework.request import Request
from rest_framework.authentication import BaseAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """Authenticate using Authorization header or the 'access_token' cookie.

    This allows the frontend to rely on HTTP-only cookies for JWT storage
    during development rather than injecting the Authorization header.
    """

    def authenticate(self, request: Request) -> Optional[Tuple[object, str]]:
        # Try standard Authorization header first
        result = super().authenticate(request)
        if result is not None:
            return result

        # Fallback to cookie named 'access_token'
        raw_token = request.COOKIES.get('access_token')
        if not raw_token:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token


