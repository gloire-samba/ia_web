from smolagents import tool, DuckDuckGoSearchTool
import os
import time
from google import genai

# ==============================================================================
# OUTILS DE RECHERCHE WEB
# ==============================================================================

@tool
def web_search(query: str) -> str:
    """
    Recherche Web (DuckDuckGo).
    Args:
        query: Mots-clés de la recherche.
    """
    try: 
        return DuckDuckGoSearchTool().run(query)
    except: 
        # 👉 CORRECTION : Un message beaucoup plus simple pour éviter que l'IA ne fasse le "Perroquet"
        return (
            "ÉCHEC_RESEAU. Impossible d'accéder à Internet pour le moment. "
            "Réponds à l'utilisateur en utilisant uniquement tes connaissances internes. "
            "Commence OBLIGATOIREMENT ta réponse par la phrase exacte : "
            "'⚠️ **ATTENTION : Suite au blocage réseau, cette réponse est générée depuis ma mémoire interne.** ⚠️'"
        )
# ==============================================================================
# OUTILS D'ANALYSE DE VIDEOS
# ==============================================================================

@tool
def outil_analyser_video(chemin_video: str, consigne_specifique: str = "Fais un résumé détaillé de cette vidéo.") -> str:
    """
    Analyse une vidéo (MP4, MOV, AVI) pour en extraire les actions, les dialogues et les événements importants.
    Utilise cet outil lorsque l'utilisateur demande de résumer, d'analyser ou de décrire une vidéo.
    
    Args:
        chemin_video: Le chemin absolu vers le fichier vidéo.
        consigne_specifique: La demande spécifique de l'utilisateur concernant la vidéo.
    """
    if not os.path.exists(chemin_video):
        return "Erreur : Le fichier vidéo est introuvable."

    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return "Erreur : Clé API Google manquante."

    try:
        client = genai.Client(api_key=api_key)
        
        # 1. Envoi de la vidéo au serveur de Google pour analyse
        print(f"🎬 Envoi de la vidéo en cours d'analyse ({os.path.basename(chemin_video)})...")
        video_file = client.files.upload(file=chemin_video)
        
        # 2. Attente de la fin du traitement par Google (nécessaire pour la vidéo)
        while video_file.state.name == "PROCESSING":
            print("⏳ L'IA visionne la vidéo...")
            time.sleep(3)
            # Rafraîchissement du statut
            video_file = client.files.get(name=video_file.name)
            
        if video_file.state.name == "FAILED":
            return "Erreur : L'IA n'a pas pu traiter cette vidéo."

        # 3. Le Prompt "Anti-Bugs" pour le comportement de vidéosurveillance
        prompt_systeme = (
            "Tu es un expert en analyse vidéo. Regarde cette vidéo avec attention et écoute l'audio. "
            "Réponds STRICTEMENT en respectant ces règles :\n"
            "1. Réponds toujours en français.\n"
            "2. ANTI-REPETITION : Ne décris pas en boucle une scène statique ou des actions répétitives "
            "(comme un hangar vide). Ne décris QUE les changements significatifs et les événements majeurs.\n"
            "3. ANTI-MOUCHE : Ignore les micro-mouvements (comme des insectes, des feuilles qui bougent "
            "ou des variations de lumière). Concentre-toi sur les humains, les véhicules et les événements narratifs.\n"
            "4. AUDIO : Si l'audio n'est que du bruit de fond ou de la musique, ignore-le. S'il y a des "
            "paroles humaines intelligibles, intègre-les dans ton résumé.\n"
            "5. TIME-CODES : À chaque changement de scène majeur ou nouvel événement, ajoute le "
            "time-code exact au format [MM:SS].\n\n"
            f"Demande de l'utilisateur : {consigne_specifique}"
        )

        # 4. Génération de l'analyse
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[video_file, prompt_systeme]
        )
        
        # 5. Nettoyage : On supprime la vidéo des serveurs de Google une fois l'analyse terminée
        client.files.delete(name=video_file.name)
        
        return f"Voici l'analyse vidéo :\n{response.text}"

    except Exception as e:
        return f"Erreur lors de l'analyse vidéo : {e}"