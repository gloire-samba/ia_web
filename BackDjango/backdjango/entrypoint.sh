#!/bin/bash

# Arrêter le script si une commande échoue
set -e

echo "⏳ Application des migrations Django..."
python manage.py makemigrations
python manage.py migrate

echo "🚀 Démarrage du serveur Django..."
exec python manage.py runserver 0.0.0.0:8000