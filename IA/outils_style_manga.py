import os
import requests
import io
import time
from PIL import Image
from smolagents import tool

# On importe Gemini pour qu'il "lise" l'image avant de la dessiner
from outils_lecture import appel_gemini_securise

# On utilise un excellent modèle d'Hugging Face spécialisé dans l'anime/manga
API_URL = "https://api-inference.huggingface.co/models/cagliostrolab/animagine-xl-3.1"

def appeler_api_huggingface(payload):
    """Fonction utilitaire robuste avec anti-crash réseau (Retry)"""
    token = os.environ.get("HF_TOKEN")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    
    max_essais = 3
    for essai in range(max_essais):
        try:
            response = requests.post(API_URL, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            return response.content
        except requests.exceptions.RequestException as e:
            if essai < max_essais - 1:
                print(f"⚠️ Micro-coupure réseau HF (essai {essai+1}/{max_essais}). Nouvelle tentative dans 3s...")
                time.sleep(3)
            else:
                raise Exception(f"Échec définitif du réseau après {max_essais} tentatives : {e}")

@tool
def outil_generer_manga(prompt: str) -> str:
    """
    Génère une NOUVELLE image au style manga à partir d'une description textuelle.
    Utilise cet outil lorsque l'utilisateur veut créer une image de toutes pièces.
    
    Args:
        prompt: La description détaillée de l'image souhaitée (ex: "un chat ninja dans une ville").
    """
    prompt_ameliore = f"masterpiece, best quality, anime style, highly detailed, {prompt}"
    
    try:
        image_bytes = appeler_api_huggingface({"inputs": prompt_ameliore})
        
        image = Image.open(io.BytesIO(image_bytes))
        chemin_sortie = os.path.abspath("generation_manga.jpg")
        image.save(chemin_sortie)
        
        return f"Image manga générée avec succès. Fichier sauvegardé sous : {chemin_sortie}"
    except Exception as e:
        # 👉 CORRECTION : Instruction stricte pour l'agent
        return (
            f"ERREUR_CRITIQUE_OUTIL : {str(e)}\n"
            "INSTRUCTION STRICTE POUR L'AGENT : L'outil a échoué à cause du réseau. Tu ne dois SURTOUT PAS dire que l'image a été créée. "
            "Tu dois OBLIGATOIREMENT répondre avec CETTE phrase exacte :\n"
            "\"⚠️ **Les serveurs de dessin sont temporairement inaccessibles (Erreur réseau Hugging Face). Veuillez réessayer dans quelques minutes.** ⚠️\""
        )

@tool
def outil_transformer_manga(chemin_image: str, prompt_additionnel: str = "style manga, anime art") -> str:
    """
    Transforme une image EXISTANTE en style manga.
    Utilise cet outil lorsque l'utilisateur fournit une image et veut la modifier.
    
    Args:
        chemin_image: Le chemin absolu du fichier image source.
        prompt_additionnel: Des instructions de style optionnelles.
    """
    if not os.path.exists(chemin_image):
        return "Erreur : Le fichier image source est introuvable."
        
    try:
        print("👁️ Étape 1 : Analyse de l'image originale par Gemini...")
        img = Image.open(chemin_image)
        # On force Gemini à parler anglais car le modèle Manga (Stable Diffusion) comprend mieux l'anglais
        description_visuelle = appel_gemini_securise(
            "Describe exactly what you see in this image (subject, pose, clothes, background, colors, lighting) in English. Keep it concise but highly descriptive so a drawing AI can replicate it perfectly.", 
            img
        )
        
        if "⚠️" in description_visuelle:
            return f"Impossible d'analyser l'image source : {description_visuelle}"

        print("🎨 Étape 2 : Génération de la version Manga...")
        prompt_ameliore = f"masterpiece, best quality, anime art style, {description_visuelle}, {prompt_additionnel}"
        
        image_bytes = appeler_api_huggingface({"inputs": prompt_ameliore})
        
        image = Image.open(io.BytesIO(image_bytes))
        dossier_sortie = os.path.dirname(os.path.abspath(chemin_image))
        nom_sortie = "manga_" + os.path.basename(chemin_image)
        chemin_sortie = os.path.join(dossier_sortie, nom_sortie)
        
        image.save(chemin_sortie)
        return f"Image transformée avec succès. Fichier sauvegardé sous : {chemin_sortie}"
    except Exception as e:
        # 👉 CORRECTION : Instruction stricte pour l'agent
        return (
            f"ERREUR_CRITIQUE_OUTIL : {str(e)}\n"
            "INSTRUCTION STRICTE POUR L'AGENT : L'outil a échoué à cause du réseau. Tu ne dois SURTOUT PAS dire que l'image a été transformée. "
            "Tu dois OBLIGATOIREMENT répondre avec CETTE phrase exacte :\n"
            "\"⚠️ **Les serveurs de dessin sont temporairement inaccessibles (Erreur réseau Hugging Face). Veuillez réessayer dans quelques minutes.** ⚠️\""
        )