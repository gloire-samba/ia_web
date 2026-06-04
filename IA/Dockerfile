# 1. On part d'un Linux avec Python 3.10
FROM python:3.10-slim

# 2. On installe LibreOffice et les outils PDF (Indispensable pour ton IA)
USER root
RUN apt-get update && apt-get install -y \
    libreoffice \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# 3. Sécurité Hugging Face : utilisateur non-root
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# 4. On installe tes bibliothèques Python
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. On copie ton fichier app.py
COPY --chown=user:user . .

# 6. On lance ton API sur le port 7860
EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]