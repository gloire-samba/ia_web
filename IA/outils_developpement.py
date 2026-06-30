import os
import subprocess
import datetime
from smolagents import tool

@tool
def outil_executer_commande_terminal(commande: str, chemin_dossier: str = ".") -> str:
    """
    Exécute une commande dans le terminal (utile pour compiler du code ou lancer des tests unitaires).
    L'agent doit utiliser son intelligence pour déduire la commande selon le langage (ex: 'pytest', 'cargo test', 'javac...').
    
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
def outil_git_commit_et_push(chemin_dossier: str, url_depot: str, branche: str = "main", message_personnalise: str = "Mise à jour automatique") -> str:
    """
    Initialise git (si besoin), ajoute les fichiers, crée un commit avec un horodatage unique, et push vers le dépôt.
    
    Args:
        chemin_dossier: Le chemin absolu du dossier contenant le code.
        url_depot: L'URL du dépôt distant (obligatoire).
        branche: Le nom de la branche (par défaut 'main').
        message_personnalise: Un petit message contextuel à ajouter au commit.
    """
    try:
        if not os.path.exists(chemin_dossier):
            os.makedirs(chemin_dossier, exist_ok=True)
            
        os.chdir(chemin_dossier)
        
        # Init si le repo n'existe pas encore
        if not os.path.exists(os.path.join(chemin_dossier, ".git")):
            subprocess.run(["git", "init"], check=True, capture_output=True)
            subprocess.run(["git", "branch", "-M", branche], check=True, capture_output=True)
        
        # Gestion du remote "origin"
        remotes = subprocess.run(["git", "remote"], capture_output=True, text=True).stdout
        if "origin" not in remotes:
            subprocess.run(["git", "remote", "add", "origin", url_depot], check=True, capture_output=True)
        else:
            subprocess.run(["git", "remote", "set-url", "origin", url_depot], check=True, capture_output=True)

        # Add et Commit
        subprocess.run(["git", "add", "."], check=True, capture_output=True)
        
        # Génération d'un nom de commit unique
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        msg = f"[{timestamp}] {message_personnalise}"
        subprocess.run(["git", "commit", "-m", msg], capture_output=True) 
        
        # Push sur la branche demandée
        result = subprocess.run(["git", "push", "-u", "origin", branche], capture_output=True, text=True)
        
        if result.returncode == 0 or "Everything up-to-date" in result.stderr or "up to date" in result.stdout:
            return f"✅ Déploiement Git réussi avec succès sur la branche '{branche}'."
        else:
            return f"⚠️ Git a retourné une erreur au push : {result.stderr}"
            
    except Exception as e:
        return f"Erreur critique lors des opérations Git : {e}"