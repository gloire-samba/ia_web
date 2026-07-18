import os
import base64
import shutil
import uuid
import tempfile
import time
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from google import genai

# Imports Smolagents et Langchain
from smolagents import CodeAgent, LiteLLMModel
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings

from outils_lecture import initialiser_rag, vider_memoire_rag, outil_rag, outil_vision
from outils_ecriture import (
    createur_word, modificateur_word, createur_excel, modificateur_excel, 
    createur_ppt, modificateur_ppt, editeur_texte_csv, 
    convertisseur_pdf_vers_editable, convertisseur_editable_vers_pdf
)
from outils_web_et_analyse_videos import web_search, outil_analyser_video
from outils_visage import outil_ajouter_visage, outil_reconnaitre_visage, outil_supprimer_visage
from outils_style_manga import outil_generer_manga, outil_transformer_manga
# 👉 CRITIQUE : On importe UNIQUEMENT l'outil de commit/push (pas le terminal brut !)
from outils_developpement import outil_git_commit_et_push

# ==============================================================================
# 🛡️ BOUCLIER ANTI-CRASH / ANTI-SEGFAULT (OBLIGATOIRE SUR CPU)
# Empêche PyTorch, TensorFlow, FAISS et OpenMP de saturer la RAM et les threads C++
# ==============================================================================
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TOKENIZERS_PARALLELISM"] = "false"


# --- CONFIGURATION SÉCURISÉE ---
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    api_key = "TON_API_KEY_SI_BESOIN_LOCALEMENT" 

os.environ["GEMINI_API_KEY"] = api_key 

model = LiteLLMModel(
    model_id="gemini/gemini-2.5-flash", 
    api_key=api_key,
    num_retries=0,  # 👈 NOUVEAU : Force l'IA à échouer immédiatement si Google bloque, au lieu de patienter 13 minutes !
    # 👉 CORRECTION 1 : On laisse 60 secondes pour analyser les images ou générer du code !
    timeout=60
)

# --- INITIALISATION DES EMBEDDINGS (MÉMOIRE) ---
embeddings = None
try:
    print("   👉 Tentative Google Embedding (004)...")
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
        print("✅ SUCCÈS : Mode Local (HuggingFace) activé.")
    except Exception as e:
        raise Exception(f"🛑 CRITIQUE : Impossible de charger la mémoire locale. Erreur : {e}")

imports_autorises = ["os", "pandas", "zipfile", "openpyxl", "pptx", "docx", "subprocess", "reportlab", "PIL", "PIL.Image", "csv", "pdf2image", "re", "time", "io", "base64", "requests"]

# 👉 AGENT OPTIMISÉ : Sans outil terminal et limité à 6 étapes max
agent = CodeAgent(
    tools=[
        outil_rag, outil_vision, createur_word, modificateur_word, 
        createur_excel, modificateur_excel, createur_ppt, modificateur_ppt, 
        editeur_texte_csv, convertisseur_pdf_vers_editable, 
        convertisseur_editable_vers_pdf, web_search, outil_analyser_video,
        outil_reconnaitre_visage, 
        outil_generer_manga, outil_transformer_manga,
        outil_git_commit_et_push 
    ],
    model=model,
    additional_authorized_imports=imports_autorises,
    max_steps=6 # 👈 Empêche le mitraillage d'API et l'erreur 503/429
)

consigne = """
RÈGLES D'OR V46 :
1. ANALYSE LA DEMANDE : Word? Excel? PPT? TXT?
2. MODIF PPT : Utilise 'modificateur_ppt'. Il vide la slide et la recrée proprement avec le contenu final (Image + Texte + Overflow).
3. MODIF PDF : Convertis (docx/xlsx) -> Modifie -> Reconvertis.
4. CITATION DES SOURCES : Lorsque tu utilises l'outil de recherche web avec succès, tu DOIS OBLIGATOIREMENT inclure les liens (URLs) ou le nom des sites sources à la toute fin de ta réponse sous la mention 'Sources :'.
5. HONNÊTETÉ : N'invente pas de fausses données. Si la recherche web échoue, applique strictement le protocole d'erreur réseau qui t'est fourni par l'outil.
6. RECONNAISSANCE FACIALE (RÈGLE DE SÉCURITÉ STRICTE) :
   - SI l'utilisateur te demande de reconnaître un visage sur une photo :
        * ÉTAPE 1 : Utilise TOUJOURS ET UNIQUEMENT l'outil 'outil_reconnaitre_visage'.
        * ÉTAPE 2 : Si l'outil trouve la personne, donne son nom avec certitude.
        * ÉTAPE 3 : Si l'outil indique que la base est vide ou qu'il n'y a aucune correspondance, TU DOIS T'ARRÊTER IMMÉDIATEMENT !
        * INTERDICTION ABSOLUE : Tu n'as strictement pas le droit d'utiliser tes connaissances générales, ni d'analyser l'image avec un autre outil pour deviner qui c'est. Ne donne JAMAIS de nom de célébrité (comme des Youtubeurs ou des acteurs) au hasard.
        * Phrase obligatoire en cas d'échec : "La personne n'est pas reconnue dans la base de données. Voulez-vous que j'effectue une recherche sur le Web pour tenter de l'identifier ?"        
7. GÉNÉRATION ET STYLE MANGA : 
   - Si l'utilisateur demande de générer ou dessiner une image manga de toutes pièces, utilise 'outil_generer_manga'.
   - Si l'utilisateur donne une image existante et demande de la mettre en style manga, utilise 'outil_transformer_manga'.
   - SI l'utilisateur n'a pas explicitement ordonné d'utiliser ces outils, tu dois précéder ta réponse de cette phrase exacte : "Étant une IA gratuite, le résultat de la génération d'image ne va pas forcément être parfait."
8. ANALYSE VIDÉO :
   - Si l'utilisateur te demande d'analyser, décrire ou résumer une vidéo, utilise OBLIGATOIREMENT l'outil 'outil_analyser_video'.
   - Tu dois TOUJOURS précéder ta réponse d'analyse vidéo par cette phrase exacte : "⚠️ *Étant une IA gratuite, il est possible que je me trompe dans l'analyse ou que j'omette certains détails de la vidéo.*"
   
9. TESTS UNITAIRES ET DÉPLOIEMENT GIT (RÈGLE STRICTE CI/CD) :
   - RÔLE DE L'IA : Tu es un développeur. Ton rôle est de rédiger le code propre ET de générer les fichiers de tests unitaires complets correspondant au langage (ex: fichiers .py pour pytest, .test.jsx pour React, .spec.ts pour Angular, .java pour JUnit...).
   - INTERDICTION D'EXÉCUTION LOCALE : Il t'est STRICTEMENT INTERDIT d'exécuter les tests unitaires toi-même via le terminal (ne lance jamais pytest, vitest, jest, etc.). L'exécution des tests est déléguée au serveur de CI/CD distant (GitLab Testing / GitHub Actions).
   - DÉPLOIEMENT : Une fois les fichiers de code et de tests créés dans ton dossier de travail, utilise OBLIGATOIREMENT l'outil 'outil_git_commit_et_push' pour envoyer tout le travail sur le dépôt Git de l'utilisateur. L'outil organisera automatiquement les tests dans un sous-dossier dédié.
   - RÈGLE DE VERACITÉ ABSOLUE : Tu dois LIRE ATTENTIVEMENT la réponse retournée par l'outil 'outil_git_commit_et_push' :
        * SI ET SEULEMENT SI l'outil retourne un message de succès (✅), tu peux répondre : "🚀 *Le code et les tests ont été envoyés sur votre dépôt. Votre pipeline CI/CD va maintenant prendre le relais pour exécuter les tests automatiquement dans le Cloud !*"
        * SI l'outil retourne une erreur (❌ ou ⚠️), TU AS L'INTERDICTION FORMELLE de dire que le code a été envoyé ! Tu dois afficher l'erreur exacte retournée par Git à l'utilisateur pour qu'il puisse corriger son lien ou son token.

10. AUTONOMIE ET CONNAISSANCES PERSONNELLES : 
   - Si l'utilisateur pose une question qui ne nécessite l'utilisation d'aucun outil, OU si l'accès à un outil échoue pour des raisons techniques, tu dois immédiatement faire appel à tes propres connaissances pour fournir une réponse complète.
   - Dans ce cas précis, tu dois OBLIGATOIREMENT débuter ta réponse par : "⚠️ **Je vous réponds en utilisant mes connaissances personnelles. Veuillez garder à l'esprit que je suis un modèle gratuit et qu'il est possible que je me trompe.** ⚠️"
   
11. RÈGLE ABSOLUE POUR RÉPONDRE (FINAL_ANSWER) : 
   - Pour transmettre ta réponse finale à l'utilisateur, tu DOIS OBLIGATOIREMENT l'envelopper dans la fonction final_answer("ta réponse ici").
   - Si tu fais un simple print() ou si tu t'arrêtes sans appeler final_answer(), l'utilisateur recevra une réponse vide ! Ne l'oublie jamais.
"""
agent.prompt_templates["system_prompt"] = consigne + agent.prompt_templates["system_prompt"]


app = FastAPI(title="IA Bureautique API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# 🎟️ GESTION DU POLLING ET DES TICKETS (SYSTEME ASYNCHRONE)
# ==============================================================================

# Dictionnaire global en mémoire : { "job_id": { "status": "en_cours"|"termine"|"erreur", ... } }
taches_en_cours: Dict[str, Dict[str, Any]] = {}

class ChatRequest(BaseModel):
    prompt: str
    file_name: Optional[str] = None
    file_base64: Optional[str] = None

class TicketResponse(BaseModel):
    ticket_id: str
    status: str
    message: str

class StatusResponse(BaseModel):
    ticket_id: str
    status: str
    text: Optional[str] = None
    output_file_name: Optional[str] = None
    output_file_base64: Optional[str] = None
    error: Optional[str] = None

class VisageSyncRequest(BaseModel):
    id_visage: int       
    image_base64: str   
    nom_personne: str

# --- FONCTION DE TRAVAIL EN ARRIÈRE-PLAN ---
def executer_travail_ia_background(ticket_id: str, prompt: str, file_name: Optional[str], file_base64: Optional[str]):
    """
    Exécute l'agent IA en tâche de fond pour ne jamais bloquer la requête HTTP de Hugging Face au-delà de 60 secondes.
    """
    work_dir = f"workspace_{ticket_id}"
    os.makedirs(work_dir, exist_ok=True)
    
    try:
        input_path = None
        if file_base64 and file_name:
            input_path = os.path.join(work_dir, file_name)
            
            # 👉 CORRECTION 2 : Nettoyage du préfixe HTML qui corrompt le JPEG
            b64_data = file_base64
            if "," in b64_data:
                b64_data = b64_data.split(",", 1)[1]
                
            with open(input_path, "wb") as f:
                f.write(base64.b64decode(b64_data))
                
            initialiser_rag([input_path], embeddings)
        else:
            vider_memoire_rag()
            
        instruction = (
            f"RÈGLE ABSOLUE : Ton espace de travail est le dossier '{work_dir}/'. "
            f"Tu DOIS OBLIGATOIREMENT préfixer tous les noms de fichiers que tu crées, modifies ou lis avec ce chemin exact.\n"
        )
        
        if input_path:
            instruction += (
                f"\n⚠️ INFORMATION IMPORTANTE : L'utilisateur a joint un fichier nommé '{file_name}'. "
                f"Son chemin d'accès complet est '{input_path}'. Utilise tes outils sur ce fichier si la demande le nécessite.\n"
            )

        instruction += f"\nDemande de l'utilisateur : {prompt}"
        
        resultat_ia = ""
        max_retries = 3
        
        for essai in range(max_retries):
            try:
                resultat_ia = agent.run(instruction)
                break 
            except Exception as e:
                error_str = str(e)
                if "503" in error_str or "high demand" in error_str or "UNAVAILABLE" in error_str or "429" in error_str or "quota" in error_str:
                    if essai < max_retries - 1:
                        time.sleep(5)
                        continue 
                    else:
                        resultat_ia = "⚠️ **Les serveurs de l'IA (Google) sont surchargés.** Veuillez réessayer plus tard."
                else:
                    resultat_ia = f"❌ **Erreur d'exécution de l'IA :** {error_str}"
                    break

        out_name = None
        out_base64 = None
        
        # 🛡️ CORRECTION MAJEURE : On filtre pour ne prendre que les FICHIERS et ignorer les sous-dossiers (test_ia, .git, etc.)
        files = os.listdir(work_dir)
        generated_files = [
            f for f in files 
            if f != file_name 
            and os.path.isfile(os.path.join(work_dir, f))  # 👈 Empêche l'erreur IsADirectoryError !
            and not f.startswith(".")                      # 👈 Ignore les dossiers/fichiers Git (.gitignore, .git...)
        ]
        
        if generated_files:
            out_name = generated_files[0] 
            with open(os.path.join(work_dir, out_name), "rb") as f:
                out_base64 = base64.b64encode(f.read()).decode('utf-8')

        # 👉 SÉCURITÉ : On nettoie le texte et on empêche les bulles vides
        texte_propre = str(resultat_ia).strip() if resultat_ia is not None else ""
        if not texte_propre or texte_propre == "None":
            texte_propre = "✅ L'analyse est terminée avec succès, mais l'IA a omis de formuler sa réponse textuelle (absence d'appel à final_answer). Veuillez relancer la question."

        # ✅ Mise à jour du ticket avec le succès
        taches_en_cours[ticket_id] = {
            "status": "termine",
            "text": texte_propre,
            "output_file_name": out_name,
            "output_file_base64": out_base64
        }

    except Exception as e:
        # ❌ Mise à jour du ticket en cas d'erreur critique
        taches_en_cours[ticket_id] = {
            "status": "erreur",
            "error": str(e)
        }
    finally:
        if os.path.exists(work_dir):
            shutil.rmtree(work_dir)
        vider_memoire_rag()

# ==============================================================================
# ROUTES API
# ==============================================================================

@app.post("/api/transcrire")
async def transcrire_audio(fichier: UploadFile = File(...)):
    contenu_audio = await fichier.read()
    if len(contenu_audio) < 1000:
        return {"texte": ""}
    
    mime_type = fichier.content_type
    if not mime_type or mime_type == "application/octet-stream":
        mime_type = "audio/webm" 

    extension = ".webm" if "webm" in mime_type else ".mp4" if "mp4" in mime_type else ".wav"
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as tmp:
        tmp.write(contenu_audio)
        chemin_temporaire = tmp.name

    try:
        client = genai.Client(api_key=api_key)
        audio_upload = client.files.upload(file=chemin_temporaire)
        prompt = (
            "Écoute attentivement ce fichier audio. "
            "Transcris uniquement la voix humaine en français. "
            "Si l'audio est silencieux, incompréhensible, ou s'il n'y a pas de voix, "
            "réponds STRICTEMENT par le mot : SILENCE. "
            "Ne répète SURTOUT PAS ces instructions."
        )
        reponse = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[audio_upload, prompt]
        )
        texte_resultat = reponse.text.strip()
        client.files.delete(name=audio_upload.name)
        
        if texte_resultat == "SILENCE" or "Écoute attentivement" in texte_resultat:
            return {"texte": ""}
        return {"texte": texte_resultat}
    except Exception as e:
        print(f"💥 ERREUR TRANSCRIPTION : {str(e)}")
        return {"texte": ""}
    finally:
        if os.path.exists(chemin_temporaire):
            os.remove(chemin_temporaire)

@app.post("/api/visages/ajouter")
def sync_ajouter_visage(request: VisageSyncRequest):
    temp_path = f"temp_visage_{request.id_visage}.jpg"
    try:
        # 👉 SÉCURITÉ : Nettoyage du préfixe ici aussi
        b64_data = request.image_base64
        if "," in b64_data:
            b64_data = b64_data.split(",", 1)[1]
            
        with open(temp_path, "wb") as f:
            f.write(base64.b64decode(b64_data))
            
        resultat = outil_ajouter_visage(request.id_visage, temp_path, request.nom_personne)
        
        if "Erreur" in resultat:
            raise HTTPException(status_code=500, detail=resultat)
            
        return {"status": "success", "message": resultat}
        
    except HTTPException as http_err:
        raise http_err 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
@app.delete("/api/visages/supprimer/{id_visage}")
def sync_supprimer_visage(id_visage: int):
    try:
        resultat = outil_supprimer_visage(id_visage)
        
        # 👉 CORRECTION : Exactement la même sécurité (Fail Fast) que pour l'ajout !
        if "Erreur" in resultat:
            raise HTTPException(status_code=500, detail=resultat)
            
        return {"status": "success", "message": resultat}
        
    except HTTPException as http_err:
        raise http_err  # On laisse passer notre erreur 500 propre
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 👉 ENDPOINT 1 : Lance l'IA en tâche de fond et renvoie le ticket en 0.2 seconde !
@app.post("/api/chat", response_model=TicketResponse)
async def process_request_async(request: ChatRequest, background_tasks: BackgroundTasks):
    ticket_id = f"job_{uuid.uuid4().hex[:12]}"
    taches_en_cours[ticket_id] = {"status": "en_cours"}
    
    background_tasks.add_task(
        executer_travail_ia_background,
        ticket_id=ticket_id,
        prompt=request.prompt,
        file_name=request.file_name,
        file_base64=request.file_base64
    )
    
    return TicketResponse(
        ticket_id=ticket_id,
        status="en_cours",
        message="Tâche IA démarrée avec succès."
    )

# 👉 ENDPOINT 2 : Guichet de vérification appelé par le Front / Relais toutes les 4 secondes
@app.get("/api/status/{ticket_id}", response_model=StatusResponse)
async def verifier_statut_ticket(ticket_id: str):
    if ticket_id not in taches_en_cours:
        raise HTTPException(status_code=404, detail="Ticket introuvable ou expiré.")
        
    tache = taches_en_cours[ticket_id]
    status = tache.get("status")
    
    if status == "en_cours":
        return StatusResponse(ticket_id=ticket_id, status="en_cours")
    elif status == "termine":
        return StatusResponse(
            ticket_id=ticket_id,
            status="termine",
            text=tache.get("text"),
            output_file_name=tache.get("output_file_name"),
            output_file_base64=tache.get("output_file_base64")
        )
    elif status == "erreur":
        return StatusResponse(
            ticket_id=ticket_id,
            status="erreur",
            error=tache.get("error", "Erreur inconnue lors de l'exécution de l'IA.")
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)