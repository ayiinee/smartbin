"""
WSGI entry point for production deployment (gunicorn, uwsgi, etc.)
Usage: gunicorn wsgi:app
"""
from app import create_app

app = create_app()
