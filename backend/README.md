# Backend — Pokie Cat API

API REST construida con Node.js y Express. Corre localmente en el puerto `4000` vía Docker Compose y se despliega en AWS como funciones Lambda detrás de API Gateway.

## Estructura

```
backend/
├── src/
│   ├── controllers/       # Reciben el request y llaman al servicio correspondiente
│   ├── services/          # Lógica de negocio — aquí van las reglas de la app
│   ├── routes/            # Definición de endpoints (auth, products, orders, expenses)
│   ├── middleware/
│   │   └── auth.js        # Validación de token JWT
│   ├── db.js              # Pool de conexión a PostgreSQL
│   ├── app.js             # Configuración de Express (middlewares, rutas, CORS)
│   ├── index.js           # Punto de entrada local (levanta el servidor)
│   └── lambda.js          # Wrapper serverless-http para AWS Lambda
└── Dockerfile
```

## Endpoints disponibles

| Método | Ruta                  | Auth | Descripción                  |
|--------|-----------------------|------|------------------------------|
| POST   | /api/auth/login       | No   | Login admin, devuelve JWT    |
| GET    | /api/products         | No   | Lista todos los productos    |
| POST   | /api/products         | Sí   | Crear producto               |
| PATCH  | /api/products/:id     | Sí   | Actualizar producto          |
| DELETE | /api/products/:id     | Sí   | Eliminar producto            |
| GET    | /api/orders           | Sí   | Lista pedidos                |
| POST   | /api/orders           | Sí   | Crear pedido                 |
| PATCH  | /api/orders/:id       | Sí   | Actualizar estado de pedido  |
| DELETE | /api/orders/:id       | Sí   | Eliminar pedido              |
| GET    | /api/expenses         | Sí   | Lista egresos                |
| POST   | /api/expenses         | Sí   | Registrar egreso             |
| DELETE | /api/expenses/:id     | Sí   | Eliminar egreso              |
| GET    | /api/health           | No   | Health check                 |

## Scripts npm

```bash
npm start      # Producción — node src/index.js
npm run dev    # Desarrollo — nodemon (hot reload)
```

## Variables de entorno

Ver `.env.example` en la raíz del proyecto.

| Variable       | Descripción                        |
|----------------|------------------------------------|
| DB_NAME        | Nombre de la base de datos         |
| DB_USER        | Usuario PostgreSQL                 |
| DB_PASSWORD    | Contraseña PostgreSQL              |
| JWT_SECRET     | Secreto para firmar tokens JWT     |
| FRONTEND_URL   | URL del frontend (para CORS)       |
