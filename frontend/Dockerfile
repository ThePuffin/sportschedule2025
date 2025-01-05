FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

# Installation des outils pour iOS (si nécessaire)
# ...

# Installation des outils pour Android (si nécessaire)
# ...

# Commande pour lancer l'application (exemple pour Android)
CMD ["npx", "react-native", "run-android"]