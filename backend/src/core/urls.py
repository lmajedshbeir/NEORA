from django.urls import path
from . import views

urlpatterns = [
    path('auth/register', views.register, name='register'),
    path('auth/verify', views.verify_email, name='verify_email'),
    path('auth/login', views.login, name='login'),
    path('auth/logout', views.logout, name='logout'),
    path('auth/refresh', views.refresh_token, name='refresh_token'),
    path('auth/forgot', views.forgot_password, name='forgot_password'),
    path('auth/reset', views.reset_password, name='reset_password'),
    path('me', views.profile, name='profile'),
]

