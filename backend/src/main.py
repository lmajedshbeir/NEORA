#!/usr/bin/env python
"""
Flask-compatible entry point for Django application.
This allows the Django app to be deployed on Flask-compatible platforms.
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

# Create the Flask-compatible application
app = get_wsgi_application()

if __name__ == "__main__":
    # For local development, run Django development server
    from django.core.management import execute_from_command_line
    execute_from_command_line(['manage.py', 'runserver', '0.0.0.0:8000'])

