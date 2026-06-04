from smolagents import tool, DuckDuckGoSearchTool

# ==============================================================================
# OUTILS D'ASSISTANCE EXTERNE ET RECHERCHE
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
        return (
            "ERREUR_RESEAU_WEB_BLOQUE. Exécute EXACTEMENT ce processus dans ta réponse finale :\n"
            "1. Explique brièvement que l'accès à Internet est bloqué temporairement.\n"
            "2. Fais une auto-évaluation stricte : connais-tu la réponse à la question avec une CERTITUDE ABSOLUE (100%) dans ta mémoire interne ?\n"
            "3. SI TU AS LE MOINDRE DOUTE : Ne tente pas de deviner. Dis simplement que sans accès Web, tu ne préfères pas t'avancer pour ne pas donner de fausses informations.\n"
            "4. SI TU ES SÛR À 100% : Affiche ce message exact avec les emojis : '⚠️ **ATTENTION : Suite au blocage réseau, cette réponse est générée depuis ma mémoire interne. Étant un modèle d'IA gratuit, veuillez vérifier ces informations.** ⚠️'. Puis, fournis ta réponse détaillée et exécute la création du fichier si demandée."
        )

# (À l'avenir, tu pourras rajouter ici d'autres outils comme un outil météo, calendrier, etc.)