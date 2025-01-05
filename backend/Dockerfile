# Utilisez une image Node.js de base
FROM node:18-alpine

# Créer le répertoire de travail
WORKDIR /usr/src/app

# Copier le package.json et les dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du code source
COPY . .

# Exposer le port (ajuster en fonction de votre configuration NestJS)
EXPOSE 3000

# Commande pour démarrer l'application
CMD ["npm", "run", "start"]
