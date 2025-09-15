from django.urls import path
from . import views

urlpatterns = [
    path('health', views.health_check, name='health_check'),
    path('connection-test', views.connection_test, name='connection_test'),
    path('test-register', views.test_register, name='test_register'),
    path('auth/register', views.register, name='register'),
    path('auth/verify', views.verify_email, name='verify_email'),
    path('auth/verify-email', views.verify_email_redirect, name='verify_email_redirect'),
    path('auth/login', views.login, name='login'),
    path('auth/logout', views.logout, name='logout'),
    path('auth/refresh', views.refresh_token, name='refresh_token'),
    path('auth/forgot', views.forgot_password, name='forgot_password'),
    path('auth/reset', views.reset_password, name='reset_password'),
    path('me', views.profile, name='profile'),
]


from django.urls import path, include
from core.views import csrf

urlpatterns = [
    path("api/csrf/", csrf),
    path("api/", include("...")),  # your existing api routes
]
