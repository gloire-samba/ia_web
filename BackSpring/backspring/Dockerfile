# ==========================================
# ÉTAPE 1 : Construction (Build) avec Maven et le JDK 21
# ==========================================
# On utilise l'image officielle Eclipse Temurin (très légère et optimisée)
FROM eclipse-temurin:21-jdk-alpine AS builder

# On définit le dossier de travail
WORKDIR /app

# On copie le "wrapper" Maven et le fichier de configuration principal
COPY .mvn/ .mvn
COPY mvnw pom.xml ./

# On donne les droits d'exécution au script Maven (indispensable sous Linux/Mac)
RUN chmod +x mvnw

# On télécharge les dépendances en cache (astuce Docker pour accélérer les futurs builds)
RUN ./mvnw dependency:go-offline

# On copie tout le code source
COPY src ./src

# On compile le projet en ignorant les tests (pour éviter que le build plante 
# si l'IA n'est pas joignable pendant la création du conteneur)
RUN ./mvnw clean package -DskipTests

# ==========================================
# ÉTAPE 2 : Exécution avec le JRE 21 (Version allégée)
# ==========================================
# Pour la production, on n'a besoin que du JRE (Java Runtime Environment), pas du compilateur complet
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# On récupère le fichier .jar généré à l'étape 1
# Le nom du fichier généré dépend de ton pom.xml, on utilise *.jar pour l'attraper de façon générique
COPY --from=builder /app/target/*.jar app.jar

# On expose le port par défaut de Spring Boot
EXPOSE 8080

# Commande de démarrage du serveur
ENTRYPOINT ["java", "-jar", "app.jar"]