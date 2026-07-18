# 1. On part d'un Linux léger avec Python 3.10 (Obligatoire pour faire tourner FastAPI et Smolagents)
FROM python:3.10-slim

# 2. On installe LibreOffice, les outils PDF (poppler), curl ET les dépendances système pour OpenCV (DeepFace)
USER root
RUN apt-get update && apt-get install -y \
    libreoffice \
    poppler-utils \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*


# 3. Création du dossier de travail et gestion stricte des permissions
WORKDIR /app
RUN useradd -m -u 1000 user && chown -R user:user /app

# 4. Sécurité Hugging Face : on devient l'utilisateur non-root
USER user

# 5. Configuration des variables d'environnement basiques
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1

# 6. Installation de tes bibliothèques Python (FastAPI, smolagents, docx, openpyxl, etc.)
COPY --chown=user:user requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# 7. Copie du code source de l'application
COPY --chown=user:user . .

# 8. Lancement de l'API sur le port 7860
EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]