import jwt
import datetime
from rest_framework import authentication
from rest_framework.permissions import BasePermission
from .models import Utilisateur
from rest_framework.permissions import SAFE_METHODS
from django.core.exceptions import ImproperlyConfigured
import os

# Lecture stricte
SECRET_KEY = os.getenv('JWT_SECRET_KEY')

if not SECRET_KEY:
    raise ImproperlyConfigured("CRITIQUE : La variable d'environnement JWT_SECRET_KEY est introuvable.")

class JwtService:
    @staticmethod
    def generer_token(utilisateur):
        maintenant = datetime.datetime.now(datetime.timezone.utc)
        payload = {
            'sub': utilisateur.email,
            'role': utilisateur.role,
            'id': utilisateur.id,
            'exp': maintenant + datetime.timedelta(days=1),
            'iat': maintenant
        }
        return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

class JWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None 

        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            user = Utilisateur.objects.get(email=payload['sub'])
            return (user, token) 
        except Exception:
            return None

class EstProprietaireProfilOuAdmin(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if request.method in ['PUT', 'PATCH']:
            return (obj == request.user) or (request.user.role == 'ROLE_ADMIN')
        return request.user.role == 'ROLE_ADMIN'