"""
Django settings for neora project.
"""

import os
from pathlib import Path
from datetime import timedelta
from urllib.parse import urlparse

# ---------- Helpers ----------
def _listenv(name: str, default: str = ""):
    return [x.strip() for x in default.split(",") if x.strip()] if not os.getenv(name) \
        else [x.strip() for x in os.getenv(name, "").split(",") if x.strip()]

# ---------- Paths / basics ----------
BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-change-me-in-production')
DEBUG = os.getenv('DJANGO_DEBUG', 'True').lower() == 'true'

# Frontend/Backend URLs (used for CORS/CSRF and links)
FRONTEND_BASE_URL = os.getenv('FRONTEND_BASE_URL', 'https://neora-frontend-hh8f.onrender.com')
BACKEND_BASE_URL = os.getenv('BACKEND_BASE_URL',  'https://neora-backend-zl4q.onrender.com')

# Render gives this automatically; we’ll use it to auto-allow the exact host
RENDER_EXTERNAL_URL = os.getenv("RENDER_EXTERNAL_URL", "")

# ---------- Hosts / CSRF / CORS ----------
ALLOWED_HOSTS = _listenv("ALLOWED_HOSTS", ".onrender.com,localhost,127.0.0.1")

# Add the exact Render hostname if present (e.g. neora-backend-xxxx.onrender.com)
if RENDER_EXTERNAL_URL:
    parsed = urlparse(RENDER_EXTERNAL_URL)
    if parsed.hostname and parsed.hostname not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(parsed.hostname)

# CSRF: must include scheme; include frontend and wildcard for Render
_csrf_default = "http://localhost:5175,https://*.onrender.com"
CSRF_TRUSTED_ORIGINS = _listenv("CSRF_TRUSTED_ORIGINS", _csrf_default)
# Ensure FRONTEND_BASE_URL and BACKEND_BASE_URL are present with https when deployed
for url in (FRONTEND_BASE_URL, BACKEND_BASE_URL, RENDER_EXTERNAL_URL):
    if url:
        u = urlparse(url)
        scheme_host = f"{u.scheme}://{u.hostname}" if u.scheme and u.hostname else ""
        if scheme_host and scheme_host not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(scheme_host)

# CORS: allow the SPA origin; also allow any *.onrender.com via regex (useful for preview URLs)
CORS_ALLOWED_ORIGINS = _listenv("CORS_ALLOWED_ORIGINS", FRONTEND_BASE_URL)
CORS_ALLOWED_ORIGIN_REGEXES = [r"^https://.*\.onrender\.com$"]
CORS_ALLOW_CREDENTIALS = True

# If you temporarily need to open it up during debugging, you can still do:
if DEBUG and os.getenv("CORS_ALLOW_ALL_ORIGINS", "").lower() == "true":
    CORS_ALLOW_ALL_ORIGINS = True

# ---------- Apps ----------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'channels',
    'axes',
    'csp',

    # Local apps
    'core',
    'chat',
    'audit',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # keep first
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # 'axes.middleware.AxesMiddleware',
    # 'csp.middleware.CSPMiddleware',
    # 'audit.middleware.AuditMiddleware',
]

ROOT_URLCONF = 'neora.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'neora.wsgi.application'
ASGI_APPLICATION = 'neora.asgi.application'

# ---------- Database ----------
import dj_database_url

if os.getenv('DATABASE_URL'):
    try:
        DATABASES = {'default': dj_database_url.parse(os.getenv('DATABASE_URL'))}
    except Exception:
        DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3'}}
elif os.getenv('POSTGRES_HOST'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('POSTGRES_DB', 'neora'),
            'USER': os.getenv('POSTGRES_USER', 'postgres'),
            'PASSWORD': os.getenv('POSTGRES_PASSWORD', ''),
            'HOST': os.getenv('POSTGRES_HOST', 'localhost'),
            'PORT': int(os.getenv('POSTGRES_PORT', '5432')),
        }
    }
else:
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3'}}

# ---------- Channels / Redis ----------
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
if REDIS_URL.startswith('redis://'):
    CHANNEL_LAYERS = {'default': {'BACKEND': 'channels_redis.core.RedisChannelLayer', 'CONFIG': {'hosts': [REDIS_URL]}}}
else:
    CHANNEL_LAYERS = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}

# ---------- Cache ----------
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}

# ---------- Auth / Passwords ----------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 10}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ---------- I18N ----------
LANGUAGE_CODE = os.getenv('LANGUAGE_CODE', 'en')
TIME_ZONE = os.getenv('TIMEZONE', 'Asia/Riyadh')
USE_I18N = True
USE_TZ = True

# ---------- Static / Media ----------
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

FILE_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  # 50MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  # 50MB
FILE_UPLOAD_PERMISSIONS = 0o644

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'core.User'

# ---------- DRF ----------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'core.auth.CookieJWTAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.LimitOffsetPagination',
    'PAGE_SIZE': 50
}
if DEBUG:
    REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = []
    REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {}

# ---------- JWT ----------
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_ACCESS_TTL', '10'))),
    'REFRESH_TOKEN_LIFETIME': timedelta(seconds=int(os.getenv('JWT_REFRESH_TTL', '1209600'))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_COOKIE': 'access_token',
    'AUTH_COOKIE_DOMAIN': None,
    'AUTH_COOKIE_SECURE': True,
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_PATH': '/',
    'AUTH_COOKIE_SAMESITE': 'None',
}

# ---------- CORS / CSRF cookies ----------
# Note: If your frontend reads the CSRF cookie to echo it in X-CSRFToken,
# the cookie must NOT be HttpOnly.
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'None'


SESSION_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = 'None'

# ---------- Security headers ----------
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Always set this on Render (behind a proxy), even in DEBUG.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

if not DEBUG:
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'True').lower() == 'true'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# ---------- CSP ----------
CONTENT_SECURITY_POLICY = {
    'DIRECTIVES': {
        'default-src': ("'self'", "data:", "blob:"),
        'connect-src': ("'self'", "https:", "wss:"),
        'script-src': ("'self'", "'unsafe-inline'"),
        'style-src': ("'self'", "'unsafe-inline'"),
        'img-src': ("'self'", "data:", "https:")
    }
}

# ---------- Axes ----------
AUTHENTICATION_BACKENDS = [
    'axes.backends.AxesStandaloneBackend',
    'django.contrib.auth.backends.ModelBackend',
]
if DEBUG:
    AXES_FAILURE_LIMIT = 20
    AXES_COOLOFF_TIME = 0.1  # 6 minutes
    AXES_ENABLE_ADMIN = True
else:
    AXES_FAILURE_LIMIT = 5
    AXES_COOLOFF_TIME = 1  # 1 hour

# ---------- Email ----------
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', '')
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'true').lower() == 'true'
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@neora.com')

# ---------- Frontend/Backend links ----------
# (already defined above; kept here for compatibility)
# FRONTEND_BASE_URL / BACKEND_BASE_URL

# ---------- n8n ----------
N8N_WEBHOOK_URL = os.getenv('N8N_WEBHOOK_URL', '')
N8N_BASIC_AUTH = os.getenv('N8N_BASIC_AUTH', '')
N8N_API_KEY_HEADER = os.getenv('N8N_API_KEY_HEADER', '')
N8N_API_KEY_VALUE = os.getenv('N8N_API_KEY_VALUE', '')

# ---------- Transcription ----------
ENABLE_TRANSCRIPTION = os.getenv('ENABLE_TRANSCRIPTION', 'false').lower() == 'true'

# ---------- Logging ----------
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {'console': {'class': 'logging.StreamHandler', 'formatter': 'verbose'}},
    'root': {'handlers': ['console'], 'level': 'INFO'},
    'loggers': {
        'django': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
        'neora': {'handlers': ['console'], 'level': 'DEBUG' if DEBUG else 'INFO', 'propagate': False},
    },
}
