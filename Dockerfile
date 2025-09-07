# Verwenden Sie die offizielle Node.js LTS Version
FROM node:18-alpine

# Arbeitsverzeichnis erstellen
WORKDIR /app

# Package.json und package-lock.json kopieren
COPY package*.json ./

# Produktions-Abhängigkeiten installieren
RUN npm install --production

# Quellcode kopieren
COPY . .

# Bot starten
CMD [ "node", "index.js" ]

# Gesundheitscheck für Container
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1