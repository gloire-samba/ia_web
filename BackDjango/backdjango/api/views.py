import json
import requests
import uuid
import urllib.parse
import os
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.shortcuts import redirect
from dotenv import load_dotenv

from .models import Utilisateur
from .serializers import UtilisateurSerializer
from .security import JwtService, EstProprietaireProfilOuAdmin

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
from .models import Visage

import base64

load_dotenv()

PYTHON_API_URL = "http://ia:7860/api/visages" # Utilise "localhost" si tu ne passes pas par le réseau Docker

# ==========================================
# 1. LE RELAIS DU CHATBOT IA 
# ==========================================
@csrf_exempt 
def chat_relay(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            response = requests.post(settings.PYTHON_API_URL, json=data)
            response.raise_for_status() 
            return JsonResponse(response.json())
        except requests.exceptions.HTTPError as e:
            return JsonResponse({'detail': e.response.text}, status=e.response.status_code)
        except Exception as e:
            return JsonResponse({'detail': str(e)}, status=500)
    return JsonResponse({'detail': 'Method Not Allowed'}, status=405)

# ==========================================
# 2. GESTION DES UTILISATEURS (CRUD)
# ==========================================
class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateur.objects.all().order_by('id')
    serializer_class = UtilisateurSerializer
    permission_classes = [EstProprietaireProfilOuAdmin]

# ==========================================
# 3. AUTHENTIFICATION LOCALE
# ==========================================
class AuthAPIView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        mot_de_passe = request.data.get('motDePasse') 
        try:
            user = Utilisateur.objects.get(email=email)
            if user.mot_de_passe == mot_de_passe:
                token = JwtService.generer_token(user)
                return Response({
                    "token": token,
                    "role": user.role,
                    "email": user.email,
                    "utilisateurId": str(user.id)
                }, status=status.HTTP_200_OK)
            return Response({"error": "Mot de passe incorrect"}, status=status.HTTP_401_UNAUTHORIZED)
        except Utilisateur.DoesNotExist:
            return Response({"error": "Utilisateur introuvable"}, status=status.HTTP_404_NOT_FOUND)

class RegisterAPIView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        mot_de_passe = request.data.get('motDePasse')
        if Utilisateur.objects.filter(email=email).exists():
            return Response({"error": "Cet email est déjà utilisé."}, status=status.HTTP_400_BAD_REQUEST)
            
        Utilisateur.objects.create(email=email, mot_de_passe=mot_de_passe, role="ROLE_USER", auth_provider="LOCAL")
        return Response({"message": "Inscription réussie !"}, status=status.HTTP_201_CREATED)

# ==========================================
# 4. OAUTH2 GOOGLE & GITHUB
# ==========================================
class GoogleLoginView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        frontend = request.GET.get('frontend', 'angular')
        redirect_uri = request.build_absolute_uri('/accounts/google/login/callback/')
        params = {
            'client_id': os.getenv('GOOGLE_CLIENT_ID'),
            'redirect_uri': redirect_uri,
            'response_type': 'code',
            'scope': 'email profile',
            'state': frontend
        }
        return redirect("https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params))

class GoogleCallbackView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        code = request.GET.get('code')
        frontend = request.GET.get('state', 'angular')
        redirect_uri = request.build_absolute_uri('/accounts/google/login/callback/')
        
        data = {
            'code': code, 'client_id': os.getenv('GOOGLE_CLIENT_ID'),
            'client_secret': os.getenv('GOOGLE_CLIENT_SECRET'), 'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code'
        }
        res = requests.post("https://oauth2.googleapis.com/token", data=data)
        access_token = res.json().get('access_token')
        
        user_info = requests.get("https://www.googleapis.com/oauth2/v2/userinfo", headers={'Authorization': f'Bearer {access_token}'}).json()
        
        utilisateur, _ = Utilisateur.objects.get_or_create(
            email=user_info.get('email'),
            defaults={'mot_de_passe': str(uuid.uuid4()), 'role': 'ROLE_USER', 'auth_provider': 'GOOGLE'}
        )
        
        frontend_url = "http://localhost:5173" if frontend == 'react' else "http://localhost:4200"
        return redirect(f"{frontend_url}/login?token={JwtService.generer_token(utilisateur)}&id={utilisateur.id}&role={utilisateur.role}&email={utilisateur.email}&backend=django")
    
# ==========================================
# 🐙 GITHUB OAUTH2 MANUEL (À rajouter dans views.py)
# ==========================================
class GithubLoginView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        frontend = request.GET.get('frontend', 'angular')
        params = {
            'client_id': os.getenv('GITHUB_CLIENT_ID'),
            'scope': 'user:email',
            'state': frontend
        }
        return redirect("https://github.com/login/oauth/authorize?" + urllib.parse.urlencode(params))

class GithubCallbackView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        code = request.GET.get('code')
        frontend = request.GET.get('state', 'angular')
        
        data = {
            'client_id': os.getenv('GITHUB_CLIENT_ID'),
            'client_secret': os.getenv('GITHUB_CLIENT_SECRET'),
            'code': code
        }
        res = requests.post("https://github.com/login/oauth/access_token", headers={'Accept': 'application/json'}, data=data)
        access_token = res.json().get('access_token')
        
        emails = requests.get("https://api.github.com/user/emails", headers={'Authorization': f'Bearer {access_token}'}).json()
        primary_email = next((e['email'] for e in emails if e.get('primary')), emails[0]['email'] if emails else None)
        
        if not primary_email:
            user_res = requests.get("https://api.github.com/user", headers={'Authorization': f'Bearer {access_token}'}).json()
            primary_email = user_res.get('login') + "@github.com"

        utilisateur, _ = Utilisateur.objects.get_or_create(
            email=primary_email,
            defaults={'mot_de_passe': str(uuid.uuid4()), 'role': 'ROLE_USER', 'auth_provider': 'GITHUB'}
        )
        
        frontend_url = "http://localhost:5173" if frontend == 'react' else "http://localhost:4200"
        return redirect(f"{frontend_url}/login?token={JwtService.generer_token(utilisateur)}&id={utilisateur.id}&role={utilisateur.role}&email={utilisateur.email}&backend=django")
    
class VisageViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny] 

    def list(self, request):
        visages = Visage.objects.all()
        return Response([{"id": v.id, "nom": v.nom, "chemin_image": v.chemin_image} for v in visages])

    def create(self, request):
        nom = request.POST.get('nom')
        image = request.FILES.get('image')

        if not image or not nom:
            return Response({"error": "Nom et image requis"}, status=400)

        image_content = image.read()

        # 1. Sauvegarde du fichier physique (CORRECTION SÉCURITÉ DJANGO)
        nom_fichier = f"{nom.lower().replace(' ', '_')}.jpg"
        chemin_relatif = f"visages/{nom_fichier}" # 👉 On utilise le chemin relatif pour le stockage
        
        # default_storage a besoin d'un chemin relatif, sinon il hurle au piratage !
        default_storage.save(chemin_relatif, ContentFile(image_content))

        # Le chemin absolu reste pour la base de données
        chemin_absolu = os.path.join(settings.MEDIA_ROOT, chemin_relatif)

        # 2. Sauvegarde en BDD
        visage = Visage.objects.create(nom=nom, chemin_image=chemin_absolu)

        # 3. Synchronisation avec FAISS
        try:
            image_b64 = base64.b64encode(image_content).decode('utf-8')
            requests.post("https://elgronaldo-web-ia.hf.space/api/visages/ajouter", json={
                "id_visage": visage.id,
                "image_base64": image_b64,
                "nom_personne": nom
            })
        except Exception as e:
            print(f"⚠️ Erreur FAISS : {e}")

        return Response({"id": visage.id, "nom": visage.nom}, status=201)

    # 👉 NOUVELLE MÉTHODE POUR LA MODIFICATION (PUT)
    def update(self, request, pk=None):
        try:
            visage = Visage.objects.get(pk=pk)
            visage.nom = request.data.get('nom', visage.nom)
            visage.chemin_image = request.data.get('chemin_image', visage.chemin_image)
            visage.save()
            return Response({"status": "success", "id": visage.id, "nom": visage.nom})
        except Visage.DoesNotExist:
            return Response({"error": "Visage introuvable"}, status=404)
        
    def destroy(self, request, pk=None):
        try:
            visage = Visage.objects.get(pk=pk)
            
            # 1. Suppression physique
            if os.path.exists(visage.chemin_image):
                os.remove(visage.chemin_image)
            
            # 2. Suppression BDD
            visage.delete()

            # 3. Suppression FAISS
            try:
                requests.delete(f"https://elgronaldo-web-ia.hf.space/api/visages/supprimer/{pk}")
            except Exception as e:
                print(f"⚠️ Erreur FAISS lors de la suppression : {e}")

            return Response({"status": "success"})
        except Visage.DoesNotExist:
            return Response(status=404)