import os
import base64
import shutil
import uuid
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Imports Smolagents et Langchain
from smolagents import CodeAgent, LiteLLMModel
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings

# 👉 Importation de tes modules
from outils_lecture import initialiser_rag, vider_memoire_rag, outil_rag, outil_vision
from outils_ecriture import (
    createur_word, modificateur_word, createur_excel, modificateur_excel, 
    createur_ppt, modificateur_ppt, editeur_texte_csv, 
    convertisseur_pdf_vers_editable, convertisseur_editable_vers_pdf
)
from outils_web_et_analyse_videos import web_search, outil_analyser_video

# 👉 LES NOUVEAUX IMPORTS POUR LES VISAGES
from outils_visage import outil_ajouter_visage, outil_reconnaitre_visage, outil_supprimer_visage

# 👉 NOUVEAU : IMPORT POUR LES MANGAS
from outils_style_manga import outil_generer_manga, outil_transformer_manga


# --- CONFIGURATION SÉCURISÉE ---
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    api_key = "TON_API_KEY_SI_BESOIN_LOCALEMENT" 

# 👉 On s'assure que LiteLLM a bien la clé sous le nom exact qu'il attend
os.environ["GEMINI_API_KEY"] = api_key 

# --- INITIALISATION DU MODÈLE PRINCIPAL (SMOLAGENTS) ---
model = LiteLLMModel(
    model_id="gemini/gemini-3.5-flash", 
    api_key=api_key
)

# --- INITIALISATION DES EMBEDDINGS (MÉMOIRE) ---
embeddings = None
try:
    print("   👉 Tentative Google Embedding (004)...")
    # 👉 CORRECTION : On retire le 'models/' et on injecte la clé explicitement
    test_emb = GoogleGenerativeAIEmbeddings(
        model="text-embedding-004", 
        google_api_key=api_key
    )
    test_emb.embed_query("test")
    embeddings = test_emb
    print("✅ SUCCÈS : Mode Google activé.")
except Exception as e:
    print(f"   ❌ Échec Google : {e}. Passage au Plan B.")

if embeddings is None:
    print("   👉 Activation du Plan B : Mémoire Locale (HuggingFace)...")
    try:
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        print("✅ SUCCÈS : Mode Local (HuggingFace) activé. C'est plus robuste !")
    except Exception as e:
        raise Exception(f"🛑 CRITIQUE : Impossible de charger la mémoire locale. Erreur : {e}")

# --- INITIALISATION DE L'AGENT ---
imports_autorises = ["os", "pandas", "zipfile", "openpyxl", "pptx", "docx", "subprocess", "reportlab", "PIL", "csv", "pdf2image", "re", "time"]

agent = CodeAgent(
    tools=[
        outil_rag, outil_vision, createur_word, modificateur_word, 
        createur_excel, modificateur_excel, createur_ppt, modificateur_ppt, 
        editeur_texte_csv, convertisseur_pdf_vers_editable, 
        convertisseur_editable_vers_pdf, web_search, outil_analyser_video,
        outil_reconnaitre_visage, # 👈 SEULEMENT la reconnaissance ici !
        outil_generer_manga, outil_transformer_manga # 👉 NOUVEAU : AJOUT DES OUTILS MANGA
    ],
    model=model,
    additional_authorized_imports=imports_autorises,
    max_steps=20
)

consigne = """
RÈGLES D'OR V45 :
1. ANALYSE LA DEMANDE : Word? Excel? PPT? TXT?
2. MODIF PPT : Utilise 'modificateur_ppt'. Il vide la slide et la recrée proprement avec le contenu final (Image + Texte + Overflow).
3. MODIF PDF : Convertis (docx/xlsx) -> Modifie -> Reconvertis.
4. CITATION DES SOURCES : Lorsque tu utilises l'outil de recherche web avec succès, tu DOIS OBLIGATOIREMENT inclure les liens (URLs) ou le nom des sites sources à la toute fin de ta réponse sous la mention 'Sources :'.
5. HONNÊTETÉ : N'invente pas de fausses données. Si la recherche web échoue, applique strictement le protocole d'erreur réseau qui t'est fourni par l'outil.
6. RECONNAISSANCE FACIALE (Règle stricte) : Si l'utilisateur donne une image et demande "Qui est cette personne ?" SANS préciser où chercher :
   - ÉTAPE A : Utilise UNIQUEMENT 'outil_vision' pour analyser l'image grâce à tes propres connaissances de modèle. N'utilise pas l'outil de base de données.
   - ÉTAPE B : SI TU RECONNAIS la personne, donne son nom et ajoute OBLIGATOIREMENT ce message d'avertissement : "⚠️ *Étant une IA gratuite, il est possible que je me trompe.*"
   - ÉTAPE C : SI TU NE RECONNAIS PAS la personne, dis-le clairement, puis propose explicitement à l'utilisateur deux options pour l'aider :
        Option 1 : Te demander de vérifier dans la base de données biométrique de l'application.
        Option 2 : Te demander de lancer une recherche sur le Web.
7. GÉNÉRATION ET STYLE MANGA (NOUVEAU) : 
   - Si l'utilisateur demande de générer ou dessiner une image manga de toutes pièces, utilise 'outil_generer_manga'.
   - Si l'utilisateur donne une image existante et demande de la mettre en style manga, utilise 'outil_transformer_manga'.
   - SI l'utilisateur n'a pas explicitement ordonné d'utiliser ces outils, tu dois précéder ta réponse de cette phrase exacte : "Étant une IA gratuite, le résultat de la génération d'image ne va pas forcément être parfait."
8. ANALYSE VIDÉO (NOUVEAU) :
   - Si l'utilisateur te demande d'analyser, décrire ou résumer une vidéo, utilise OBLIGATOIREMENT l'outil 'outil_analyser_video'.
   - Tu dois TOUJOURS précéder ta réponse d'analyse vidéo par cette phrase exacte : "⚠️ *Étant une IA gratuite, il est possible que je me trompe dans l'analyse ou que j'omette certains détails de la vidéo.*"
"""
agent.prompt_templates["system_prompt"] = consigne + agent.prompt_templates["system_prompt"]


# --- API FASTAPI ---
app = FastAPI(title="IA Bureautique API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    prompt: str
    file_name: Optional[str] = None
    file_base64: Optional[str] = None

class ChatResponse(BaseModel):
    text: str
    output_file_name: Optional[str] = None
    output_file_base64: Optional[str] = None
    
class VisageSyncRequest(BaseModel):
    id_visage: int       
    image_base64: str    # 👉 On remplace chemin_image par image_base64
    nom_personne: str

@app.post("/api/visages/ajouter")
async def sync_ajouter_visage(request: VisageSyncRequest):
    temp_path = f"temp_visage_{request.id_visage}.jpg"
    try:
        # 1. On recrée l'image physiquement de manière temporaire pour DeepFace
        with open(temp_path, "wb") as f:
            f.write(base64.b64decode(request.image_base64))
            
        # 2. On passe le chemin temporaire à l'outil FAISS
        resultat = outil_ajouter_visage(request.id_visage, temp_path, request.nom_personne)
        
        return {"status": "success", "message": resultat}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # 3. On nettoie l'image temporaire pour ne pas saturer l'espace HuggingFace
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.delete("/api/visages/supprimer/{id_visage}")
async def sync_supprimer_visage(id_visage: int):
    try:
        resultat = outil_supprimer_visage(id_visage)
        return {"status": "success", "message": resultat}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def process_request(request: ChatRequest):
    session_id = str(uuid.uuid4())
    work_dir = f"workspace_{session_id}"
    os.makedirs(work_dir, exist_ok=True)

    try:
        input_path = None
        if request.file_base64 and request.file_name:
            input_path = os.path.join(work_dir, request.file_name)
            with open(input_path, "wb") as f:
                f.write(base64.b64decode(request.file_base64))
            
            initialiser_rag([input_path], embeddings)
        else:
            vider_memoire_rag()
            
        instruction = (
            f"RÈGLE ABSOLUE : Ton espace de travail est le dossier '{work_dir}/'. "
            f"Tu DOIS OBLIGATOIREMENT préfixer tous les noms de fichiers que tu crées, modifies ou lis avec ce chemin exact.\n"
        )
        
        if input_path:
            instruction += (
                f"\n⚠️ INFORMATION IMPORTANTE : L'utilisateur a joint un fichier nommé '{request.file_name}'. "
                f"Son chemin d'accès complet est '{input_path}'. Utilise tes outils sur ce fichier si la demande le nécessite.\n"
            )

        instruction += f"\nDemande de l'utilisateur : {request.prompt}"
        try:
            # On tente de faire réfléchir l'agent
            resultat_ia = agent.run(instruction)
        except Exception as e:
            # Si le LLM plante (surcharge Google, quota, etc.), on intercepte !
            error_str = str(e)
            if "503" in error_str or "high demand" in error_str or "UNAVAILABLE" in error_str:
                resultat_ia = "⚠️ **L'IA de Google est actuellement surchargée** (Erreur 503). Les serveurs gratuits sont pris d'assaut. Veuillez réessayer dans quelques instants ! ⏳"
            elif "429" in error_str or "quota" in error_str:
                resultat_ia = "🛑 **Le quota gratuit de l'API Google est atteint pour aujourd'hui.**"
            else:
                resultat_ia = f"❌ **Une erreur est survenue dans le cerveau de l'IA :** {error_str}"

        out_name = None
        out_base64 = None
        
        files = os.listdir(work_dir)
        generated_files = [f for f in files if f != request.file_name]
        
        if generated_files:
            out_name = generated_files[0] 
            with open(os.path.join(work_dir, out_name), "rb") as f:
                out_base64 = base64.b64encode(f.read()).decode('utf-8')

        return ChatResponse(
            text=str(resultat_ia),
            output_file_name=out_name,
            output_file_base64=out_base64
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if os.path.exists(work_dir):
            shutil.rmtree(work_dir)
        vider_memoire_rag()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)