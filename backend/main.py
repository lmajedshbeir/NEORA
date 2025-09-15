#!/usr/bin/env python
"""
Django WSGI/ASGI entry point for production deployment.
"""
import os
import sys
from pathlib import Path

# Add the project directory to the Python path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'neora.settings')

# Import Django and configure
import django
django.setup()

# Import the WSGI application
from django.core.wsgi import get_wsgi_application
from django.core.asgi import get_asgi_application

# Create WSGI application for HTTP requests
wsgi_application = get_wsgi_application()

# Create ASGI application for WebSocket support
asgi_application = get_asgi_application()

# For compatibility with deployment platforms
application = wsgi_application

if __name__ == "__main__":
    # Run Django development server
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)

