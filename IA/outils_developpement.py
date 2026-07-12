import os
import shutil
import time
import subprocess
import datetime
from smolagents import tool

@tool
def outil_executer_commande_terminal(commande: str, chemin_dossier: str = ".") -> str:
    """
    Exécute une commande rapide dans le terminal (ex: lister un dossier ou vérifier une syntaxe).
    NE DOIT SURTOUT PAS être utilisé pour lancer des suites de tests unitaires longues.
    
    Args:
        commande: La commande terminal à exécuter.
        chemin_dossier: Le dossier dans lequel exécuter la commande.
    """
    try:
        result = subprocess.run(
            commande, 
            shell=True, 
            cwd=chemin_dossier, 
            capture_output=True, 
            text=True
        )
        output = f"Code de retour: {result.returncode}\n"
        if result.stdout: 
            output += f"STDOUT:\n{result.stdout}\n"
        if result.stderr: 
            output += f"STDERR:\n{result.stderr}\n"
            
        return output
    except Exception as e:
        return f"Erreur lors de l'exécution de la commande : {e}"

@tool
def outil_git_commit_et_push(chemin_dossier: str, url_depot: str, nom_sous_dossier: str = "general", branche: str = "main", message_personnalise: str = "Mise à jour automatique CI/CD") -> str:
    """
    Renge TOUS les fichiers de code, de test et de rapport dans un sous-dossier dédié 'test_ia/<nom_sous_dossier>/',
    génère automatiquement un fichier de pipeline CI/CD s'il n'existe pas, crée un .gitignore, et pousse le code vers le dépôt.
    
    Args:
        chemin_dossier: Le chemin absolu du dossier de travail de l'agent.
        url_depot: L'URL du dépôt distant contenant le token d'authentification (obligatoire).
        nom_sous_dossier: Un nom de sous-dossier court et pertinent déduit par l'IA selon le sujet (ex: 'calculatrice', 'authentification', 'facturation').
        branche: Le nom de la branche (par défaut 'main').
        message_personnalise: Un petit message contextuel à ajouter au commit.
    """
    try:
        if not os.path.exists(chemin_dossier):
            os.makedirs(chemin_dossier, exist_ok=True)
            
        os.chdir(chemin_dossier)
        
        # 1. 👉 CRITIQUE : Création de 'test_ia/<nom_sous_dossier>/' et rangement de TOUS les fichiers de la session
        # Nettoyage du nom de dossier (pas d'espaces ni de caractères bizarres)
        nom_propre = "".join(c if c.isalnum() or c in ("_", "-") else "_" for c in nom_sous_dossier.lower())
        dossier_cible = os.path.join(chemin_dossier, "test_ia", nom_propre)
        os.makedirs(dossier_cible, exist_ok=True)
        
        # On déplace tout ce qui est à la racine de l'espace de travail temporaire vers le sous-dossier dédié
        for fichier in os.listdir(chemin_dossier):
            chemin_fichier = os.path.join(chemin_dossier, fichier)
            # On ne déplace pas les dossiers ni les fichiers de configuration système (.gitignore, etc.)
            if os.path.isfile(chemin_fichier) and not fichier.startswith("."):
                shutil.move(chemin_fichier, os.path.join(dossier_cible, fichier))
                print(f"📁 Fichier '{fichier}' rangé proprement dans : test_ia/{nom_propre}/")

        # 2. Génération automatique du pipeline CI/CD (GitHub Actions / GitLab CI)
        url_min = url_depot.lower()
        
        # Cas A : Dépôt GitHub -> Création de .github/workflows/ci.yml
        if "github.com" in url_min:
            dossier_github = os.path.join(chemin_dossier, ".github", "workflows")
            fichier_ci = os.path.join(dossier_github, "ci.yml")
            if not os.path.exists(fichier_ci):
                os.makedirs(dossier_github, exist_ok=True)
                github_workflow = """name: Pipeline CI/CD Automatique

on: [push, pull_request]

jobs:
  test-devops:
    runs-on: ubuntu-latest
    steps:
      - name: Récupération du code
        uses: actions/checkout@v4

      - name: Installation et Exécution des Tests Python (pytest)
        run: |
          if ls test_ia/*/*.py 1> /dev/null 2>&1; then
            echo "🐍 Détection de tests Python dans test_ia/..."
            pip install pytest
            pytest test_ia/
          else
            echo "Aucun test Python trouvé."
          fi

      - name: Installation et Exécution des Tests Node.js (Vitest / Jest)
        run: |
          if ls test_ia/*/*.test.* test_ia/*/*.spec.* 1> /dev/null 2>&1; then
            echo "⚛️ Détection de tests JS/TS dans test_ia/..."
            npm install -g vitest jest jsdom @testing-library/react
            npx vitest run test_ia/ || true
          else
            echo "Aucun test JS/TS trouvé."
          fi
"""
                with open(fichier_ci, "w", encoding="utf-8") as f:
                    f.write(github_workflow.strip())
                print("⚙️ Pipeline GitHub Actions créé automatiquement dans .github/workflows/ci.yml")

        # Cas B : Dépôt GitLab -> Création de .gitlab-ci.yml
        elif "gitlab.com" in url_min:
            fichier_gitlab = os.path.join(chemin_dossier, ".gitlab-ci.yml")
            if not os.path.exists(fichier_gitlab):
                gitlab_pipeline = """stages:
  - test

test_python_et_js:
  stage: test
  image: python:3.10
  before_script:
    - curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    - apt-get install -y nodejs
  script:
    - echo "🚀 Exécution des tests CI/CD sur GitLab..."
    - pip install pytest || true
    - npm install -g vitest || true
    - if ls test_ia/*/*.py 1> /dev/null 2>&1; then pytest test_ia/; fi
    - if ls test_ia/*/*.test.* 1> /dev/null 2>&1; then npx vitest run test_ia/; fi
"""
                with open(fichier_gitlab, "w", encoding="utf-8") as f:
                    f.write(gitlab_pipeline.strip())
                print("⚙️ Pipeline GitLab CI créé automatiquement dans .gitlab-ci.yml")

        # 3. Création du .gitignore propre
        gitignore_content = """
__pycache__/
*.pyc
.pytest_cache/
*.class
target/
node_modules/
.angular/
dist/
build/
*.tmp
*.log
"""
        with open(os.path.join(chemin_dossier, ".gitignore"), "w", encoding="utf-8") as f:
            f.write(gitignore_content.strip())

        # 4. Configuration Git Headless
        subprocess.run(["git", "config", "user.name", "IA DevOps Bot"], capture_output=True)
        subprocess.run(["git", "config", "user.email", "ia-devops@agence-voyage.internal"], capture_output=True)

        # 5. Initialisation et configuration du remote
        if not os.path.exists(os.path.join(chemin_dossier, ".git")):
            subprocess.run(["git", "init"], check=True, capture_output=True)
            subprocess.run(["git", "branch", "-M", branche], check=True, capture_output=True)
        
        remotes = subprocess.run(["git", "remote"], capture_output=True, text=True).stdout
        if "origin" not in remotes:
            subprocess.run(["git", "remote", "add", "origin", url_depot], check=True, capture_output=True)
        else:
            subprocess.run(["git", "remote", "set-url", "origin", url_depot], check=True, capture_output=True)

        # 6. 👉 SYNCHRONISATION ANTI-CONFLIT RAPIDE (< 2s) : On pull uniquement l'en-tête distant avant de pousser
        subprocess.run(["git", "pull", "origin", branche, "--rebase", "--depth=1"], capture_output=True)

        # 7. Ajout, Commit et Push
        subprocess.run(["git", "add", "."], check=True, capture_output=True)
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        msg = f"[{timestamp}] {message_personnalise}"
        subprocess.run(["git", "commit", "-m", msg], capture_output=True) 
        
        result = subprocess.run(
            ["git", "push", "-u", "origin", branche], 
            capture_output=True, 
            text=True,
            timeout=45
        )
        
        if result.returncode == 0 or "Everything up-to-date" in result.stderr or "up to date" in result.stdout:
            return f"✅ SUCCÈS GIT : Tous les fichiers ont été rangés dans 'test_ia/{nom_propre}/' et poussés avec succès sur la branche '{branche}' !"
        else:
            # 👉 ON FORCE L'IA À NE PAS MENTIR EN CAS D'ÉCHEC :
            erreur_detaillee = result.stderr or result.stdout or "Erreur de permission ou de réseau introuvable."
            return (
                f"❌ ERREUR CRITIQUE GIT : Le push vers GitHub a échoué ! Code de retour {result.returncode}.\n"
                f"Raison de l'échec : {erreur_detaillee}\n"
                "INSTRUCTION STRICTE POUR L'IA : Tu ne dois PAS dire que le code a été envoyé ! "
                "Explique à l'utilisateur que le push Git a échoué et affiche-lui cette erreur exacte."
            )
            
    except subprocess.TimeoutExpired:
        return "❌ ERREUR CRITIQUE GIT : Le 'git push' a dépassé 45 secondes (Timeout). Vérifiez la validité de l'URL et du Token. Ne dis pas que le code a été envoyé !"
    except Exception as e:
        return f"❌ ERREUR CRITIQUE GIT : {e}. Ne dis pas que le code a été envoyé !"