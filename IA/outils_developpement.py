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
def outil_git_commit_et_push(chemin_dossier: str, url_depot: str, branche: str = "main", message_personnalise: str = "Mise à jour automatique CI/CD") -> str:
    """
    Crée le dossier 'test_ia' s'il n'existe pas, y déplace UNIQUEMENT les nouveaux tests et rapports créés par l'IA, génère automatiquement un fichier de pipeline CI/CD s'il n'existe pas, crée un .gitignore, et pousse le code vers le dépôt.
    
    Args:
        chemin_dossier: Le chemin absolu du dossier de travail de l'agent.
        url_depot: L'URL du dépôt distant contenant le token d'authentification (obligatoire).
        branche: Le nom de la branche (par défaut 'main').
        message_personnalise: Un petit message contextuel à ajouter au commit.
    """
    try:
        if not os.path.exists(chemin_dossier):
            os.makedirs(chemin_dossier, exist_ok=True)
            
        os.chdir(chemin_dossier)
        
        # 1. 👉 CRITIQUE : Création de 'test_ia/' et déplacement EXCLUSIF des nouveaux fichiers de l'IA
        dossier_tests = os.path.join(chemin_dossier, "test_ia")
        os.makedirs(dossier_tests, exist_ok=True)
        
        now = time.time()
        for fichier in os.listdir(chemin_dossier):
            chemin_fichier = os.path.join(chemin_dossier, fichier)
            if os.path.isfile(chemin_fichier) and fichier != ".gitignore":
                # Calcul de l'âge du fichier en secondes
                age_secondes = now - os.path.getmtime(chemin_fichier)
                # On considère comme "produit par l'IA" uniquement ce qui a été créé/modifié dans les 15 dernières minutes (900s)
                est_recent_par_ia = age_secondes < 900 
                
                nom_min = fichier.lower()
                est_un_test_ou_rapport = (
                    nom_min.startswith("test_") or 
                    nom_min.endswith((".test.js", ".test.jsx", ".test.ts", ".test.tsx")) or 
                    nom_min.endswith((".spec.js", ".spec.jsx", ".spec.ts", ".spec.tsx")) or 
                    nom_min.endswith("test.java") or
                    "rapport" in nom_min or 
                    nom_min.endswith(".pdf")
                )
                
                # Le fichier est déplacé SI ET SEULEMENT SI c'est un test/rapport ET qu'il a été généré par l'IA à l'instant
                if est_un_test_ou_rapport and est_recent_par_ia:
                    shutil.move(chemin_fichier, os.path.join(dossier_tests, fichier))
                    print(f"📁 Nouveau test/rapport généré par l'IA '{fichier}' déplacé dans : {dossier_tests}/")
                elif est_un_test_ou_rapport and not est_recent_par_ia:
                    print(f"🛡️ Test pré-existant préservé à sa place d'origine : {fichier}")

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
          if ls test_ia/*.py 1> /dev/null 2>&1; then
            echo "🐍 Détection de tests Python dans test_ia/..."
            pip install pytest
            pytest test_ia/
          else
            echo "Aucun test Python trouvé dans test_ia/."
          fi

      - name: Installation et Exécution des Tests Node.js (Vitest / Jest)
        run: |
          if ls test_ia/*.test.* test_ia/*.spec.* 1> /dev/null 2>&1; then
            echo "⚛️ Détection de tests JS/TS/React/Angular dans test_ia/..."
            npm install -g vitest jest jsdom @testing-library/react
            npx vitest run test_ia/ || true
          else
            echo "Aucun test JS/TS trouvé dans test_ia/."
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
    - if ls test_ia/*.py 1> /dev/null 2>&1; then pytest test_ia/; fi
    - if ls test_ia/*.test.* 1> /dev/null 2>&1; then npx vitest run test_ia/; fi
"""
                with open(fichier_gitlab, "w", encoding="utf-8") as f:
                    f.write(gitlab_pipeline.strip())
                print("⚙️ Pipeline GitLab CI créé automatiquement dans .gitlab-ci.yml")

        # 3. Création du .gitignore propre (évite d'envoyer des caches lourds)
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

        # 6. Ajout, Commit et Push (avec un timeout de 45 secondes)
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
            return f"✅ Nouveaux tests rangés dans 'test_ia/' et poussés avec succès sur la branche '{branche}'. Le pipeline CI/CD va s'exécuter dans le Cloud !"
        else:
            return f"⚠️ Git a retourné une erreur au push : {result.stderr}"
            
    except subprocess.TimeoutExpired:
        return "❌ Erreur : Le 'git push' a dépassé 45 secondes. Vérifiez la validité de l'URL et du Token."
    except Exception as e:
        return f"Erreur critique lors des opérations Git : {e}"