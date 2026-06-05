import os
import requests
import io
from PIL import Image
from smolagents import tool

# On utilise un excellent modèle d'Hugging Face spécialisé dans l'anime/manga
API_URL = "https://api-inference.huggingface.co/models/cagliostrolab/animagine-xl-3.1"

def appeler_api_huggingface(payload):
    """Fonction utilitaire pour appeler l'API HF avec le Token du Space"""
    # Hugging Face Spaces injecte automatiquement HF_TOKEN dans l'environnement
    token = os.environ.get("HF_TOKEN")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    
    response = requests.post(API_URL, headers=headers, json=payload)
    response.raise_for_status()
    return response.content

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
        return f"Erreur lors de la génération de l'image via l'API : {e}"

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
        
    prompt_ameliore = f"masterpiece, best quality, anime style, {prompt_additionnel}. Redraw the concept of the provided image."
    
    try:
        image_bytes = appeler_api_huggingface({"inputs": prompt_ameliore})
        
        image = Image.open(io.BytesIO(image_bytes))
        dossier_sortie = os.path.dirname(os.path.abspath(chemin_image))
        nom_sortie = "manga_" + os.path.basename(chemin_image)
        chemin_sortie = os.path.join(dossier_sortie, nom_sortie)
        
        image.save(chemin_sortie)
        return f"Image transformée avec succès. Fichier sauvegardé sous : {chemin_sortie}"
    except Exception as e:
        return f"Erreur lors de la transformation de l'image : {e}"