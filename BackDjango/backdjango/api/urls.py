from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'utilisateurs', views.UtilisateurViewSet, basename='utilisateur')
router.register(r'visages', views.VisageViewSet, basename='visage')

urlpatterns = [
    # Le relais IA (Étape 1 : Démarrage et obtention du ticket)
    path('api/chat', views.chat_relay, name='chat_relay'),
    
    # 👉 NOUVEAU : Le relais IA (Étape 2 : Vérification du statut en boucle)
    path('api/chat/status/<str:ticket_id>', views.check_status_relay, name='check_status_relay'),
    path('api/chat/status/<str:ticket_id>/', views.check_status_relay, name='check_status_relay_slash'),
    
    # Authentification Locale
    path('api/auth/login/', views.AuthAPIView.as_view(), name='login'),
    path('api/auth/register/', views.RegisterAPIView.as_view(), name='register'),
    
    # Authentification OAuth2
    path('api/auth/google/login/', views.GoogleLoginView.as_view()),
    path('accounts/google/login/callback/', views.GoogleCallbackView.as_view()),
    path('api/auth/github/login/', views.GithubLoginView.as_view()),
    path('accounts/github/login/callback/', views.GithubCallbackView.as_view()),
    
    # API Utilisateurs
    path('api/', include(router.urls)),
]