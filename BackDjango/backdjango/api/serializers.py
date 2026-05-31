from rest_framework import serializers
from .models import Utilisateur

class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ['id', 'email', 'role', 'auth_provider', 'date_inscription']
        # On ne renvoie jamais le mot de passe !