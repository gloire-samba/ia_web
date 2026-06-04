#!/bin/bash

# Arrêter le script si une commande échoue
set -e

echo "⏳ Application des migrations Django..."
python manage.py makemigrations
python manage.py migrate

# 👉 NOUVEAU : On lance le script qui vérifie si la base est vide et charge les 500 images
echo "🌱 Vérification et Auto-amorçage des visages et créations des utilisateurs..."
python manage.py seed_utilisateurs
python manage.py seed_visages

echo "🚀 Démarrage du serveur Django..."
exec python manage.py runserver 0.0.0.0:8000