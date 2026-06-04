import os
from django.core.management.base import BaseCommand
from faker import Faker
from api.models import Utilisateur # Vérifie que le chemin d'import correspond à ton architecture

class Command(BaseCommand):
    help = 'Génère un Admin et 100 utilisateurs fictifs'

    def handle(self, *args, **kwargs):
        fake = Faker('fr_FR')

        # 1. Création de l'Admin en clair
        if not Utilisateur.objects.filter(email="admin@ia.com").exists():
            Utilisateur.objects.create(
                email="admin@ia.com",
                mot_de_passe="admin123", # À adapter selon ta méthode de hachage (ex: make_password)
                role="ROLE_ADMIN"
            )
            self.stdout.write(self.style.SUCCESS("👑 Compte Administrateur (admin@ia.com) créé !"))

        # 2. Création de 100 faux utilisateurs
        nb_utilisateurs_actuels = Utilisateur.objects.count()
        
        if nb_utilisateurs_actuels <= 1:
            self.stdout.write('🌱 Génération de 100 utilisateurs fictifs avec Faker...')
            
            for _ in range(100):
                # Utilise Faker pour générer des données réalistes
                prenom = fake.first_name().lower()
                nom = fake.last_name().lower().replace(" ", "")
                email = f"{prenom}.{nom}@{fake.free_email_domain()}"
                
                Utilisateur.objects.create(
                    email=email,
                    mot_de_passe="password123",
                    role="ROLE_USER"
                )
                
            self.stdout.write(self.style.SUCCESS('✅ 100 faux utilisateurs ajoutés avec succès !'))
        else:
            self.stdout.write(self.style.SUCCESS("✅ La base utilisateurs est déjà peuplée."))