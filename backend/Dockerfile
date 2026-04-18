# Backend — Node.js + Express
FROM node:18-alpine

WORKDIR /app

# Instalar dependencias primero (aprovecha caché)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copiar código fuente
COPY src/ ./src/

EXPOSE 4000

CMD ["node", "src/index.js"]
