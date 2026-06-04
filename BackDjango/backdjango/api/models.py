from django.db import models
import uuid

class Utilisateur(models.Model):
    email = models.CharField(max_length=100, unique=True)
    # Nullable car les connexions Google/Github n'ont pas de mot de passe local
    mot_de_passe = models.CharField(max_length=255, null=True, blank=True) 
    role = models.CharField(max_length=20, default='ROLE_USER')
    auth_provider = models.CharField(max_length=20, default='LOCAL')
    date_inscription = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'UTILISATEUR'
        
    @property
    def is_authenticated(self):
        return True

    def __str__(self):
        return self.email
    
class Visage(models.Model):
    nom = models.CharField(max_length=255)
    chemin_image = models.CharField(max_length=500, unique=True)

    def __str__(self):
        return self.nom