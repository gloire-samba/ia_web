# 1. On part d'un Linux avec Python 3.10
FROM python:3.10-slim

# 2. On installe LibreOffice, les outils PDF, et curl
USER root
RUN apt-get update && apt-get install -y \
    libreoffice \
    poppler-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 2.bis Installer Node.js (Version 20 LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# 👉 NOUVEAU : Installation GLOBALE de Vitest et de l'écosystème React
RUN npm install -g vitest jsdom react react-dom @testing-library/react @testing-library/dom

# 3. Création du dossier et gestion stricte des permissions
WORKDIR /app
RUN useradd -m -u 1000 user && chown -R user:user /app

# 4. Sécurité Hugging Face : on devient l'utilisateur non-root
USER user

# 👉 NOUVEAU : On ajoute NODE_PATH pour que Node trouve les modules globaux
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    NODE_PATH=/usr/lib/node_modules

# 5. On installe tes bibliothèques Python
COPY --chown=user:user requirements.txt .
Run pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# 6. On copie ton code source
COPY --chown=user:user . .

# 7. On lance ton API
EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]