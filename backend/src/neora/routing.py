from django.urls import re_path
from chat.consumers import StreamConsumer, ChatConsumer

websocket_urlpatterns = [
    re_path(r'ws/stream/?$', StreamConsumer.as_asgi()),
    re_path(r'ws/chat/?$', ChatConsumer.as_asgi()),
]

