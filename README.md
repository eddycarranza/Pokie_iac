# 🐱 Pokie Cat — Infraestructura como Código

Proyecto e-commerce con arquitectura de 3 capas desplegada con Docker.

## Arquitectura

```
┌─────────────────────────────────────────────┐
│              docker-compose.yml              │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Frontend │  │ Backend  │  │    DB    │  │
│  │  React   │→ │ Express  │→ │ Postgres │  │
│  │ :3000    │  │  :4000   │  │  :5432   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
```

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git

## Levantar el proyecto

```bash
# 1. Clona el repo
git clone https://github.com/TU_USUARIO/pokie-iac.git
cd pokie-iac

# 2. Crea tu archivo de variables de entorno
cp .env.example .env
# Edita .env con tus valores si lo deseas

# 3. Construye y levanta los 3 contenedores
docker compose up --build

# 4. Abre el navegador
# Tienda:  http://localhost:3000
# API:     http://localhost:4000/health
```

## Credenciales por defecto

| Campo    | Valor               |
|----------|---------------------|
| Email    | admin@pookiecat.pe  |
| Password | admin123            |

## Comandos útiles

```bash
# Ver logs de un servicio
docker compose logs backend -f

# Apagar todo
docker compose down

# Apagar y borrar base de datos
docker compose down -v

# Reconstruir solo el backend
docker compose up --build backend
```

## Estructura del proyecto

```
pokie-iac/
├── frontend/          # React + Nginx
│   ├── src/
│   │   ├── lib/api.js          # cliente HTTP (reemplaza supabase)
│   │   ├── hooks/useApi.js     # hooks de datos
│   │   └── context/AuthContext.jsx
│   ├── Dockerfile
│   └── nginx.conf
├── backend/           # Node.js + Express
│   ├── src/
│   │   ├── index.js
│   │   ├── db.js               # conexión PostgreSQL
│   │   ├── middleware/auth.js  # validación JWT
│   │   └── routes/             # products, orders, expenses, auth
│   └── Dockerfile
├── database/
│   └── init.sql       # crea tablas al iniciar PostgreSQL
├── docker-compose.yml
├── .env               # variables locales (no subir a git)
└── .env.example       # plantilla segura para compartir
```
