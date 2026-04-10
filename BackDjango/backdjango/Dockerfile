# On utilise la version exacte de Python demandée, dans sa version allégée (slim)
FROM python:3.12.7-slim

# ==========================================
# Configuration des variables d'environnement
# ==========================================
# Empêche Python de créer des fichiers .pyc (inutiles dans un conteneur)
ENV PYTHONDONTWRITEBYTECODE=1
# Force Python à afficher les logs en temps réel dans la console Docker
ENV PYTHONUNBUFFERED=1

# On définit le dossier de travail
WORKDIR /app

# ==========================================
# Installation des dépendances
# ==========================================
# On copie d'abord uniquement le fichier des dépendances pour utiliser le cache Docker
COPY requirements.txt .

# On installe les paquets Python sans garder le cache d'installation pour alléger l'image
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ==========================================
# Copie du code et Exécution
# ==========================================
# On copie tout le reste du projet
COPY . .

# On expose le port 8000
EXPOSE 8000

# ⚠️ La commande de démarrage
# Dans Docker, il faut absolument préciser "0.0.0.0" pour que le serveur 
# accepte les connexions venant de l'extérieur du conteneur.
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]