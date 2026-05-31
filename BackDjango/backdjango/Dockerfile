FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Rendre le script exécutable
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

# On utilise explicitement bash pour lire le script
ENTRYPOINT ["bash", "/app/entrypoint.sh"]