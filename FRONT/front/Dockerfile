# ==========================================
# ÉTAPE 1 : Construction avec Node 24 (Requis pour Angular 21)
# ==========================================
# On passe sur Node 24 pour garantir une compatibilité parfaite avec Angular 21
FROM node:24-alpine AS builder

WORKDIR /app

# On copie les fichiers de configuration npm
COPY package*.json ./

# Installation des dépendances (y compris le CLI Angular 21)
RUN npm install

# On copie le reste du code source
COPY . .

# On compile l'application. 
# Angular 21 utilise le nouveau "Application Builder" par défaut.
RUN npm run build

# ==========================================
# ÉTAPE 2 : Serveur web léger avec Nginx
# ==========================================
FROM nginx:alpine

# On nettoie le dossier par défaut de Nginx
RUN rm -rf /usr/share/nginx/html/*

# On copie les fichiers compilés.
# Avec Angular 21, le dossier cible inclut toujours /browser par défaut.
COPY --from=builder /app/dist/front/browser /usr/share/nginx/html

# On injecte notre configuration pour le routage
COPY nginx.conf /etc/nginx/conf.d/default.conf

# On ouvre le port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]