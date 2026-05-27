# ==========================================
# ÉTAPE 1 : Construction (Builder) avec Node 24
# ==========================================
FROM node:24-alpine AS builder

# Définir le dossier de travail dans le conteneur
WORKDIR /app

# Copier les fichiers de dépendances en premier (pour optimiser le cache Docker)
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier tout le reste du code source
COPY . .

# Compiler le projet React (Vite va générer un dossier "dist")
RUN npm run build

# ==========================================
# ÉTAPE 2 : Serveur de production (Nginx)
# ==========================================
FROM nginx:alpine

# Remplacer la configuration Nginx par défaut par la nôtre
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier UNIQUEMENT les fichiers compilés (le dossier "dist" généré par Vite)
# depuis l'étape 1 vers le dossier web de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Exposer le port 80
EXPOSE 80

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]