import os
import requests
import base64
from django.core.management.base import BaseCommand
from django.conf import settings
from api.models import Visage

class Command(BaseCommand):
    help = 'Télécharge des visages aléatoires et initialise FAISS'

    def handle(self, *args, **kwargs):
        if Visage.objects.exists():
            self.stdout.write(self.style.SUCCESS("✅ Base Visages Django déjà initialisée."))
            return

        dossier_dest = os.path.join(settings.MEDIA_ROOT, 'visages')
        os.makedirs(dossier_dest, exist_ok=True)
        self.stdout.write("🌱 Téléchargement de 50 visages dynamiques pour le Seed Django...")

        try:
            # 👉 AJOUT DE "&nat=fr,us,gb" ICI AUSSI
            reponse = requests.get("https://randomuser.me/api/?results=50&inc=name,picture&nat=fr,us,gb")
            data = reponse.json()
            count = 0

            for user in data.get('results', []):
                nom = f"{user['name']['first']} {user['name']['last']}"
                image_url = user['picture']['large']
                
                nom_fichier = f"{nom.lower().replace(' ', '_')}.jpg"
                chemin_cible = os.path.join(dossier_dest, nom_fichier)

                # 1. On récupère les octets de l'image
                img_data = requests.get(image_url).content
                with open(chemin_cible, 'wb') as handler:
                    handler.write(img_data)

                # 2. Sauvegarde BDD Django
                visage = Visage.objects.create(nom=nom, chemin_image=chemin_cible)

                # 3. Encodage Base64 et Envoi à FAISS (HuggingFace)
                try:
                    image_b64 = base64.b64encode(img_data).decode('utf-8')
                    
                    requests.post("https://elgronaldo-web-ia.hf.space/api/visages/ajouter", json={
                        "id_visage": visage.id,
                        "image_base64": image_b64,
                        "nom_personne": nom
                    })
                    self.stdout.write(f"➕ Visage téléchargé et encodé : {nom}")
                except Exception as e:
                    self.stderr.write(f"⚠️ Erreur FAISS pour {nom}: {e}")

                count += 1

            self.stdout.write(self.style.SUCCESS(f"✅ {count} visages téléchargés et synchronisés !"))
        except Exception as e:
            self.stderr.write(f"⚠️ Erreur de téléchargement réseau : {e}")