from django.urls import path
from . import views

urlpatterns = [
    # Cette route correspondra à la fin de l'URL (ex: /chat)
    path('chat', views.chat_relay, name='chat_relay'),
]