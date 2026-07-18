import os
import sys
import base64
import requests
from django.apps import AppConfig
from django.conf import settings  # 👉 NOUVEL IMPORT


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        """
        🔄 SYNCHRONISATION AUTOMATIQUE AU DÉMARRAGE DE DJANGO
        Équivalent de @EventListener(ApplicationReadyEvent.class) de Spring Boot.
        """
        # 1. Sécurité : Empêche la double exécution causée par l'auto-reloader de Django en développement
        if 'runserver' in sys.argv and os.environ.get('RUN_MAIN') != 'true':
            return

        # 2. Sécurité : On ignore si on lance des commandes utilitaires (migrations, tests, shell...)
        commandes_ignorees = ['makemigrations', 'migrate', 'test', 'collectstatic', 'createsuperuser']
        if any(cmd in sys.argv for cmd in commandes_ignorees):
            return

        try:
            # 👉 IMPORTANT : On importe le modèle ici pour éviter l'erreur "AppRegistryNotReady"
            from .models import Visage

            visages = list(Visage.objects.all())

            if not visages:
                print("ℹ️ [Django] Aucun visage en base de données. L'IA restera vide.")
                return

            print(f"🔄 [Django] Démarrage de la synchronisation de {len(visages)} visage(s) vers l'IA...")

            # 👉 CORRECTION : On utilise l'URL dynamique (Local ou Prod) depuis les settings
            ia_base_url = getattr(settings, 'PYTHON_API_URL', 'http://ia:7860/api/chat').replace('/api/chat', '')
            url_ia = f"{ia_base_url}/api/visages/ajouter"

            for visage in visages:
                if os.path.exists(visage.chemin_image):
                    try:
                        with open(visage.chemin_image, "rb") as f:
                            image_content = f.read()
                            image_b64 = base64.b64encode(image_content).decode('utf-8')

                            payload = {
                                "id_visage": visage.id,
                                "image_base64": image_b64,
                                "nom_personne": visage.nom
                            }

                            response = requests.post(url_ia, json=payload, timeout=10)

                            if response.status_code in [200, 201]:
                                print(f"✅ [Django] Synchronisé : {visage.nom}")
                            else:
                                print(f"⚠️ [Django] Erreur synchro pour {visage.nom} (HTTP {response.status_code})")
                    except Exception as e:
                        print(f"❌ [Django] Échec de la synchro pour {visage.nom} : {e}")
                else:
                    print(f"⚠️ [Django] Image physique introuvable pour : {visage.nom} (chemin: {visage.chemin_image})")

            print("🚀 [Django] Synchronisation FAISS terminée avec succès !")

        except Exception as e:
            # Cette exception est capturée silencieusement au tout premier lancement si la table VISAGE n'existe pas encore
            print(f"ℹ️ [Django] Synchronisation ignorée au démarrage (base non prête ou en cours d'initialisation) : {e}")