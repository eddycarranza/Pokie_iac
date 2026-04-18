# Frontend — React (multi-stage build)

# Etapa 1: compilar
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm install --silent
COPY . .
RUN npm run build

# Etapa 2: servir con Nginx
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
