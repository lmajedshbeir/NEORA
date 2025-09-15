from django.urls import path
from . import views

urlpatterns = [
    path('messages', views.list_messages, name='list_messages'),
    path('messages', views.create_message, name='create_message'),
    path('voice', views.upload_voice, name='upload_voice'),
]

