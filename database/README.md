# Base de datos — PostgreSQL

Script de inicialización que Docker Compose ejecuta automáticamente la primera vez que levanta el contenedor de PostgreSQL.

## Tablas

| Tabla         | Descripción                                      |
|---------------|--------------------------------------------------|
| `admin_users` | Usuarios administradores con contraseña bcrypt   |
| `products`    | Catálogo de productos con stock y categorías     |
| `orders`      | Pedidos de clientes con items en JSON            |
| `expenses`    | Registro de egresos/gastos del negocio           |

## Credenciales por defecto (seed)

| Campo    | Valor              |
|----------|--------------------|
| Email    | admin@pookiecat.pe |
| Password | admin123           |

## Reset completo

```bash
# Borra los volúmenes y recrea la BD desde cero
docker compose down -v
docker compose up --build
```
