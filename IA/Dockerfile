# 1. On part d'un Linux avec Python 3.10
FROM python:3.10-slim

# 2. On installe LibreOffice et les outils PDF (Indispensable pour ton IA)
USER root
RUN apt-get update && apt-get install -y \
    libreoffice \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# 3. Création du dossier et gestion stricte des permissions AVANT de changer d'utilisateur
WORKDIR /app
RUN useradd -m -u 1000 user && chown -R user:user /app

# 4. Sécurité Hugging Face : on devient l'utilisateur non-root
USER user

# On configure les variables d'environnement utiles pour HF
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1

# 5. On installe tes bibliothèques Python
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. On copie ton code source
COPY --chown=user:user . .

# 7. On lance ton API sur le port 7860
EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]