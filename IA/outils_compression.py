import os
import subprocess
from PIL import Image
import fitz  # PyMuPDF
from smolagents import tool

def generer_nom_compresse(chemin: str) -> str:
    """Génère le nom de fichier avec le suffixe _compressed."""
    base, ext = os.path.splitext(chemin)
    return f"{base}_compressed{ext}"

@tool
def outil_compresser_image(chemin_image: str) -> str:
    """
    Compresse une image (JPG, PNG) pour réduire son poids.
    Args:
        chemin_image: Le chemin absolu du fichier image à compresser.
    """
    if not os.path.exists(chemin_image):
        return "Erreur : Fichier introuvable."
    
    chemin_sortie = generer_nom_compresse(chemin_image)
    try:
        img = Image.open(chemin_image)
        # S'assure que le mode est compatible avec le format JPEG si besoin
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.save(chemin_sortie, optimize=True, quality=60)
        return f"Image compressée avec succès : {chemin_sortie}"
    except Exception as e:
        return f"Erreur lors de la compression de l'image : {e}"

@tool
def outil_compresser_pdf(chemin_pdf: str) -> str:
    """
    Compresse un document PDF en supprimant les données inutiles (garbage).
    Args:
        chemin_pdf: Le chemin absolu du fichier PDF à compresser.
    """
    if not os.path.exists(chemin_pdf):
        return "Erreur : Fichier introuvable."
        
    chemin_sortie = generer_nom_compresse(chemin_pdf)
    try:
        doc = fitz.open(chemin_pdf)
        # garbage=4 : nettoyage maximal, deflate=True : compression des flux
        doc.save(chemin_sortie, garbage=4, deflate=True)
        return f"PDF compressé avec succès : {chemin_sortie}"
    except Exception as e:
        return f"Erreur lors de la compression du PDF : {e}"

@tool
def outil_compresser_video(chemin_video: str) -> str:
    """
    Compresse une vidéo (MP4, MOV, etc.) de manière ultra-rapide.
    Args:
        chemin_video: Le chemin absolu du fichier vidéo à compresser.
    """
    if not os.path.exists(chemin_video):
        return "Erreur : Fichier introuvable."
        
    chemin_sortie = generer_nom_compresse(chemin_video)
    # L'argument '-preset ultrafast' est crucial pour ne pas dépasser les 60 secondes !
    cmd = [
        'ffmpeg', '-y', '-i', chemin_video,
        '-vcodec', 'libx264', '-crf', '28', '-preset', 'ultrafast',
        '-acodec', 'copy', chemin_sortie
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return f"Vidéo compressée avec succès : {chemin_sortie}"
    except Exception as e:
        return f"Erreur lors de la compression de la vidéo : {e}"

@tool
def outil_compresser_audio(chemin_audio: str) -> str:
    """
    Compresse un fichier audio (MP3, WAV, etc.) en abaissant son bitrate.
    Args:
        chemin_audio: Le chemin absolu du fichier audio à compresser.
    """
    if not os.path.exists(chemin_audio):
        return "Erreur : Fichier introuvable."
        
    chemin_sortie = generer_nom_compresse(chemin_audio)
    # Compression à 64kbps (rapide et suffisant pour de la voix/musique standard)
    cmd = [
        'ffmpeg', '-y', '-i', chemin_audio,
        '-b:a', '64k', chemin_sortie
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return f"Audio compressé avec succès : {chemin_sortie}"
    except Exception as e:
        return f"Erreur lors de la compression audio : {e}"