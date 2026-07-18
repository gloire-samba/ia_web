from smolagents import tool
import os
import time
from google import genai
from tavily import TavilyClient

# ==============================================================================
# OUTILS DE RECHERCHE WEB
# ==============================================================================

@tool
def web_search(query: str) -> str:
    """
    Recherche des informations sur le Web en temps réel (via Tavily AI).
    Utilise cet outil pour l'actualité, la météo ou des faits qui ne sont pas dans ta mémoire interne.
    
    Args:
        query: Les mots-clés ou la question de la recherche.
    """
    api_key = os.environ.get("TAVILY_API_KEY")
    if not api_key:
        return (
            "ERREUR_OUTIL : La clé API Tavily est manquante.\n"
            "INSTRUCTION STRICTE POUR L'AGENT : Ne retente pas d'utiliser cet outil. "
            "Réponds à l'utilisateur en utilisant uniquement tes connaissances personnelles avec l'avertissement d'IA gratuite."
        )

    try:
        tavily = TavilyClient(api_key=api_key)
        # include_answer=True demande à l'API de formuler directement un résumé synthétique
        resultat = tavily.search(query=query, search_depth="basic", max_results=4, include_answer=True)
        
        reponse_texte = ""
        if resultat.get("answer"):
            reponse_texte += f"Résumé Web : {resultat['answer']}\n\n"
            
        reponse_texte += "Sources complémentaires :\n"
        for obj in resultat.get("results", []):
            reponse_texte += f"- [{obj['title']}]({obj['url']}) : {obj['content'][:200]}...\n"
            
        return reponse_texte
        
    except Exception as e:
        # En cas d'erreur de réseau ou de quota, on applique l'injonction stricte pour éviter l'explosion des appels Gemini
        return (
            f"ERREUR_OUTIL : La recherche web a échoué ({str(e)}).\n"
            "INSTRUCTION STRICTE POUR L'AGENT : Il t'est interdit de répéter ou d'essayer à nouveau cette recherche. "
            "Tu dois OBLIGATOIREMENT répondre à la demande de l'utilisateur en utilisant uniquement "
            "les connaissances internes de ton modèle de langage.\n"
            "Tu dois commencer ta réponse finale par CETTE phrase exacte :\n"
            "\"⚠️ **L'accès au réseau est bloqué pour le moment. Je vous réponds donc en utilisant mes connaissances personnelles. Veuillez garder à l'esprit que je suis un modèle gratuit et qu'il est possible que je me trompe.** ⚠️\""
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