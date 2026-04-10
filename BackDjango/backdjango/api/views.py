import json
import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

# @csrf_exempt autorise Angular à envoyer des requêtes POST sans jeton de sécurité Django
@csrf_exempt 
def chat_relay(request):
    if request.method == 'POST':
        try:
            # 1. On lit le JSON envoyé par Angular (prompt, file_name, file_base64)
            data = json.loads(request.body)

            # 2. On envoie ces données à l'IA Python (FastAPI sur le port 7860)
            # settings.PYTHON_API_URL vient de ton fichier settings.py
            response = requests.post(settings.PYTHON_API_URL, json=data)
            
            # Si FastAPI renvoie une erreur (ex: 503, 500, 429), on lève une exception
            response.raise_for_status() 

            # 3. On renvoie la réponse exacte de l'IA à Angular
            return JsonResponse(response.json())

        # --- NOUVEAU BLOC : On attrape les erreurs de Hugging Face / Google ---
        except requests.exceptions.HTTPError as e:
            # e.response.text contient le vrai message (ex: "high demand...")
            return JsonResponse({'detail': e.response.text}, status=e.response.status_code)
        
        # ----------------------------------------------------------------------

        except requests.exceptions.RequestException as e:
            # Erreur si le serveur FastAPI est éteint ou injoignable
            return JsonResponse({'detail': f"Erreur de communication avec le cerveau IA : {str(e)}"}, status=502)
        except json.JSONDecodeError:
            return JsonResponse({'detail': 'Format JSON invalide envoyé par Angular'}, status=400)
        except Exception as e:
            return JsonResponse({'detail': str(e)}, status=500)

    # Si quelqu'un essaie d'accéder à l'URL via son navigateur (GET)
    return JsonResponse({'detail': 'Seules les requêtes POST sont autorisées'}, status=405)