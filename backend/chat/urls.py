from django.urls import path
from . import views

urlpatterns = [
    path('messages/', views.messages_view, name='messages'),
    path('voice/', views.upload_voice, name='upload_voice'),
    path('messages/clear/', views.clear_messages, name='clear_messages'),
]

