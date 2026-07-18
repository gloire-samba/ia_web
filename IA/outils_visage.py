import os
import json
import numpy as np
import faiss
from deepface import DeepFace
from smolagents import tool

# ==============================================================================
# CONFIGURATION DE LA BASE VECTORIELLE (FAISS AVEC IDs SPRING)
# ==============================================================================

INDEX_FILE = "visages_index.faiss"
MAPPING_FILE = "visages_noms.json"
MODEL_NAME = "Facenet" # Modèle léger et très performant sur CPU
DIMENSION = 128 # Facenet produit des vecteurs de taille 128

# Initialisation globale (Le dictionnaire est maintenant un objet {}, pas une liste [])
if os.path.exists(INDEX_FILE) and os.path.exists(MAPPING_FILE):
    index_visages = faiss.read_index(INDEX_FILE)
    with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
        noms_visages = json.load(f)
    print(f"✅ Base biométrique chargée ({index_visages.ntotal} visages).")
else:
    # 👉 CRITIQUE : IndexIDMap permet d'attacher les IDs de Spring aux vecteurs !
    index_base = faiss.IndexFlatL2(DIMENSION)
    index_visages = faiss.IndexIDMap(index_base)
    noms_visages = {} 
    print("⚠️ Base biométrique vide. Prête pour l'initialisation par Spring Boot.")

def sauvegarder_base():
    """Sauvegarde les vecteurs FAISS et le dictionnaire des noms."""
    faiss.write_index(index_visages, INDEX_FILE)
    with open(MAPPING_FILE, 'w', encoding='utf-8') as f:
        json.dump(noms_visages, f, ensure_ascii=False, indent=4)

def extraire_embedding(chemin_image):
    """Utilise DeepFace pour transformer un visage en vecteur mathématique."""
    # 👉 CORRECTION ICI : On passe enforce_detection à False
    # Si OpenCV ne voit pas un visage "parfait" (tête penchée, avatar générique...),
    # il ne plantera plus et forcera le calcul sur l'image entière !
    resultats = DeepFace.represent(chemin_image, model_name=MODEL_NAME, enforce_detection=False)
    # On prend le premier visage trouvé sur la photo
    embedding = np.array(resultats[0]["embedding"], dtype=np.float32)
    return embedding

# ==============================================================================
# OUTILS POUR L'AGENT SMOLAGENTS ET L'API SPRING
# ==============================================================================

# 🛑 PAS DE @tool ICI : C'est Spring qui appelle cette fonction silencieusement !
def outil_ajouter_visage(id_visage: int, chemin_image: str, nom_personne: str) -> str:
    """Ajoute un vecteur en forçant l'ID généré par Spring Boot."""
    global index_visages, noms_visages
    try:
        emb = extraire_embedding(chemin_image)
        # Ajout avec un ID explicite provenant de la base H2
        index_visages.add_with_ids(np.expand_dims(emb, axis=0), np.array([id_visage], dtype=np.int64))
        noms_visages[str(id_visage)] = nom_personne
        sauvegarder_base()
        return f"Succès : Le visage de {nom_personne} (ID {id_visage}) a été encodé et ajouté à FAISS."
    except ValueError:
        return "Erreur : Aucun visage détecté sur cette image. Veuillez fournir une photo plus claire."
    except Exception as e:
        return (
            f"ERREUR_CRITIQUE_OUTIL : {str(e)}\n"
            "INSTRUCTION STRICTE POUR L'AGENT : Tu ne dois plus essayer d'utiliser cet outil. "
            "La base de données privée de l'application est inaccessible. Tu ne dois SURTOUT PAS essayer d'inventer le nom de la personne. "
            "Tu dois OBLIGATOIREMENT répondre avec CETTE phrase exacte :\n"
            "\"⚠️ **La connexion à la base de données biométrique est temporairement interrompue. Je peux observer l'image grâce à ma vision générale, mais je ne peux pas interroger notre système pour identifier formellement cette personne.** ⚠️\""
        )

# 🛑 PAS DE @tool ICI : C'est Spring qui appelle cette fonction silencieusement !
def outil_supprimer_visage(id_visage: int) -> str:
    """Supprime proprement un vecteur via son ID Spring."""
    global index_visages, noms_visages
    try:
        # FAISS exige un format précis pour chercher et supprimer un ID
        index_visages.remove_ids(np.array([id_visage], dtype=np.int64))
        
        # On supprime aussi le nom du dictionnaire
        if str(id_visage) in noms_visages:
            del noms_visages[str(id_visage)]
            
        sauvegarder_base()
        return f"Succès : Visage ID {id_visage} supprimé de FAISS."
    except Exception as e:
        return (
            f"ERREUR_CRITIQUE_OUTIL : {str(e)}\n"
            "INSTRUCTION STRICTE POUR L'AGENT : Tu ne dois plus essayer d'utiliser cet outil. "
            "La base de données privée de l'application est inaccessible. Tu ne dois SURTOUT PAS essayer d'inventer le nom de la personne. "
            "Tu dois OBLIGATOIREMENT répondre avec CETTE phrase exacte :\n"
            "\"⚠️ **La connexion à la base de données biométrique est temporairement interrompue. Je peux observer l'image grâce à ma vision générale, mais je ne peux pas interroger notre système pour identifier formellement cette personne.** ⚠️\""
        )

@tool
def outil_reconnaitre_visage(chemin_image: str) -> str:
    """
    Analyse une image pour identifier la personne parmi celles enregistrées dans la base biométrique.
    
    Args:
        chemin_image: Le chemin absolu vers l'image à analyser.
    """
    global index_visages, noms_visages
    if index_visages.ntotal == 0:
        return "La base de données biométrique est actuellement vide."
    
    try:
        emb = extraire_embedding(chemin_image)
        
        # Recherche du vecteur le plus proche (k=1)
        k = 1 
        distances, indices = index_visages.search(np.expand_dims(emb, axis=0), k)
        
        distance = distances[0][0]
        idx = indices[0][0] # 👉 C'est l'ID de Spring !
        
        # Seuil L2 pour Facenet (10.0 est la limite stricte recommandée par DeepFace)
        seuil_tolerance = 10.0 
        
        if distance < seuil_tolerance and idx != -1:
            # On utilise .get() car noms_visages est maintenant un dictionnaire {}
            nom_trouve = noms_visages.get(str(idx), "Inconnu")
            return f"Identification réussie : J'ai trouvé {nom_trouve} dans la base de données de l'application."
        else:
            # 👉 NOUVEAU MESSAGE POUR L'AGENT
            return (
                "Je n'ai trouvé aucune correspondance pour ce visage dans la base de données. "
                "Dis-le poliment à l'utilisateur, puis propose-lui de relancer la recherche soit "
                "via l'outil de recherche Web, soit via tes connaissances générales (si cela n'a pas déjà été fait)."
            )
            
    except ValueError:
        return "Erreur : Aucun visage humain n'a été détecté sur cette image."
    except Exception as e:
        return (
            f"ERREUR_CRITIQUE_OUTIL : {str(e)}\n"
            "INSTRUCTION STRICTE POUR L'AGENT : Tu ne dois plus essayer d'utiliser cet outil. "
            "La base de données privée de l'application est inaccessible. Tu ne dois SURTOUT PAS essayer d'inventer le nom de la personne. "
            "Tu dois OBLIGATOIREMENT répondre avec CETTE phrase exacte :\n"
            "\"⚠️ **La connexion à la base de données biométrique est temporairement interrompue. Je peux observer l'image grâce à ma vision générale, mais je ne peux pas interroger notre système pour identifier formellement cette personne.** ⚠️\""
        )