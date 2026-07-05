# Frontend — Pokie Cat

Tienda e-commerce y panel de administración construidos con React. Se sirve con Nginx en producción y con el servidor de desarrollo de React en local.

## Estructura

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Home.jsx              # Tienda pública (banner, catálogo, filtros)
│   │   ├── AdminDashboard.jsx    # Panel admin (productos, pedidos, egresos, banner)
│   │   └── AdminLogin.jsx        # Login de administrador
│   ├── components/
│   │   ├── Navbar.jsx            # Barra de navegación con categorías y carrito
│   │   ├── ProductCard.jsx       # Tarjeta de producto en el catálogo
│   │   ├── ProductModal.jsx      # Modal de detalle de producto
│   │   ├── CartSidebar.jsx       # Sidebar del carrito de compras
│   │   └── Logo.jsx              # Logo de Pookiecat
│   ├── context/
│   │   ├── AuthContext.jsx       # Contexto de autenticación (login/logout/token)
│   │   └── Home.jsx              # Página principal con hero banner y catálogo
│   ├── hooks/
│   │   └── useApi.js             # Hooks: useProducts, useOrders, useExpenses
│   └── lib/
│       └── api.js                # Cliente HTTP centralizado (base URL del backend)
├── public/
├── Dockerfile
└── nginx.conf                    # Configuración Nginx para SPA (React Router)
```

## Rutas

| Ruta                    | Descripción              |
|-------------------------|--------------------------|
| `/`                     | Tienda pública           |
| `/admin`                | Login de administrador   |
| `/admin/dashboard`      | Panel de administración  |

## Variables de entorno

| Variable              | Descripción                        |
|-----------------------|------------------------------------|
| REACT_APP_API_URL     | URL base del backend (`/api`)      |
