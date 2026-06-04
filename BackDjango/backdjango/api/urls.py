from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'utilisateurs', views.UtilisateurViewSet, basename='utilisateur')
router.register(r'visages', views.VisageViewSet, basename='visage')

urlpatterns = [
    # Le relais IA
    path('api/chat', views.chat_relay, name='chat_relay'),
    
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