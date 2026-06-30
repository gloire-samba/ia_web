import os
import time
import pandas as pd
import docx2txt
import pymupdf4llm
from PIL import Image
from pptx import Presentation
from smolagents import tool
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import MarkdownTextSplitter

# 👉 LE NOUVEL IMPORT OFFICIEL GOOGLE
from google import genai 

# ==============================================================================
# FONCTIONS DE LECTURE GLOBALE ET VISION
# ==============================================================================

def appel_gemini_securise(prompt, image=None):
    """Appel Gemini Vision sécurisé avec le NOUVEAU SDK (google-genai) et Gemini 2.5."""
    max_retries = 6
    wait_time = 10
    
    # Récupération de la clé depuis l'environnement
    api_key = os.environ.get("GOOGLE_API_KEY", "TON_API_KEY_SI_BESOIN_LOCALEMENT")
    
    # Nouvelle méthode d'initialisation
    try:
        client = genai.Client(api_key=api_key)
    except Exception as e:
        return f"Erreur Init Client : {e}"

    model_name = "gemini-3.5-flash"

    for i in range(max_retries):
        try:
            # Nouveau format de passage des paramètres (contents)
            contents = [prompt, image] if image else prompt
            response = client.models.generate_content(
                model=model_name,
                contents=contents
            )
            return response.text
            
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg: 
                time.sleep(wait_time)
                wait_time *= 2
            elif "404" in error_msg: 
                model_name = "gemini-2.5-flash" # Fallback si le 3.5 est introuvable
            else: 
                return f"Erreur Vision : {e}"
                
    return "Échec Quota."

def convertir_tout_document(chemin_fichier):
    """Dispatcher Universel"""
    if not os.path.exists(chemin_fichier): return ""
    ext = os.path.splitext(chemin_fichier)[1].lower()
    texte = ""
    print(f"📂 Lecture ({ext}) : {os.path.basename(chemin_fichier)}")
    try:
        if ext == ".pdf": texte = pymupdf4llm.to_markdown(chemin_fichier)
        elif ext in [".jpg", ".png", ".jpeg"]:
            img = Image.open(chemin_fichier)
            texte = appel_gemini_securise("Décris cette image en détail.", img)
        elif ext == ".docx": texte = docx2txt.process(chemin_fichier)
        elif ext == ".pptx":
            prs = Presentation(chemin_fichier)
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text"): texte += shape.text + "\n"
        elif ext in [".xlsx", ".xls"]:
            try: texte = pd.read_excel(chemin_fichier).fillna("").to_markdown(index=False)
            except: pass
        elif ext == ".txt":
            with open(chemin_fichier, 'r', encoding='utf-8', errors='ignore') as f: texte = f.read()
        elif ext == ".csv":
            try: texte = pd.read_csv(chemin_fichier).to_markdown(index=False)
            except: pass
    except Exception as e: return f"Erreur lecture globale: {e}"
    return texte

@tool
def outil_vision(chemin_image: str, question: str) -> str:
    """
    Analyse image avec Gemini.
    Args:
        chemin_image: Chemin de l'image.
        question: Question à poser.
    """
    try: return appel_gemini_securise(f"{question}", Image.open(chemin_image))
    except: return "Erreur Vision"

# ==============================================================================
# GESTION DU RAG (MÉMOIRE TEMPORAIRE DE L'AGENT)
# ==============================================================================

vectorstore_global = None

def initialiser_rag(fichiers, embeddings):
    """Initialise le RAG avec les documents fournis et les embeddings injectés"""
    global vectorstore_global
    text_data = ""
    for f in fichiers: text_data += convertir_tout_document(f) + "\n\n"
    if not text_data.strip(): return
    chunks = MarkdownTextSplitter(chunk_size=1000).split_text(text_data)
    vectorstore_global = FAISS.from_texts(chunks, embeddings)
    print("✅ Mémoire chargée.")

def vider_memoire_rag():
    """Vide la mémoire RAG entre deux requêtes API"""
    global vectorstore_global
    vectorstore_global = None

@tool
def outil_rag(question: str) -> str:
    """
    Cherche des informations UNIQUEMENT dans les documents fournis par l'utilisateur (RAG).
    NE L'UTILISE PAS pour des questions de culture générale.
    Args:
        question: La question.
    """
    global vectorstore_global
    if vectorstore_global is None: return "Aucun document fourni par l'utilisateur."
    try:
        docs = vectorstore_global.similarity_search(question, k=10)
        return "\n".join([d.page_content for d in docs])
    except: return "Erreur RAG"
