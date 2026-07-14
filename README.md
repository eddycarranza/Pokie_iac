# Pokie Cat — Infraestructura como Código

E-commerce de ropa con arquitectura serverless en AWS, desplegada con Terraform. Incluye entorno local completo con Docker Compose para desarrollo y pruebas, pipeline CI/CD con GitHub Actions, análisis de seguridad IaC con Checkov y monitoreo en tiempo real con Grafana Cloud + Loki.

## Arquitectura local (Docker Compose)

```
┌──────────────────────────────────────────────┐
│               docker-compose.yml             │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Frontend │  │ Backend  │  │    DB     │  │
│  │  React   │→ │ Express  │→ │ Postgres  │  │
│  │ :3000    │  │  :4000   │  │  :5432    │  │
│  └──────────┘  └──────────┘  └───────────┘  │
└──────────────────────────────────────────────┘
```

## Arquitectura AWS (Terraform)

VPC + RDS Multi-AZ + RDS Proxy → Lambdas (Node.js) → API Gateway + WAFv2 → CloudFront + S3 → Cognito + KMS + Secrets Manager + Step Functions + SQS + SNS + CloudWatch + Synthetics Canary

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git
- Terraform >= 1.5 (solo para despliegue en AWS)

## Levantar el proyecto localmente

```bash
# 1. Clona el repo
git clone https://github.com/eddycarranza/Pokie_iac.git
cd Pokie_iac

# 2. Construye y levanta los 3 contenedores
docker compose up --build

# 3. Abre el navegador
# Tienda:        http://localhost:3000
# Panel admin:   http://localhost:3000/admin/dashboard
# API:           http://localhost:4000/api/products
```

## Credenciales por defecto

| Campo    | Valor              |
|----------|--------------------|
| Email    | admin@pookiecat.pe |
| Password | admin123           |

## Comandos útiles

```bash
# Ver logs de un servicio
docker compose logs backend -f
docker compose logs frontend -f

# Apagar todo
docker compose down

# Apagar y borrar base de datos (reset completo)
docker compose down -v

# Reconstruir un solo servicio
docker compose up --build backend
docker compose up --build frontend

# Correr análisis de seguridad Checkov
docker run --rm -v ./iac/tf:/tf bridgecrew/checkov:3 --directory /tf --compact

# Ejecutar pruebas unitarias
cd backend && npm test
```

## CI/CD Pipeline (GitHub Actions)

El pipeline se activa en cada push a `main` o Pull Request y ejecuta 5 jobs:

| Job | Herramienta | Descripción |
|-----|-------------|-------------|
| `test` | Jest | 25 pruebas unitarias (ProductService, PaymentService, edge cases) |
| `sonarqube` | SonarCloud | Análisis estático de calidad y cobertura de código |
| `checkov` | Checkov | Escaneo de seguridad IaC — 486 checks sobre Terraform |
| `terraform` | Terraform | `init` + `validate` + `plan` de la infraestructura AWS |
| `build-push` | Docker + GHCR | Build paralelo de imágenes backend y frontend → GitHub Container Registry |

## Pruebas Unitarias

```bash
cd backend
npm test
```

- **25 tests passing** distribuidos en 4 suites
- `product.service.test.js` — CRUD de productos con mock de pg Pool
- `payment.service.test.js` — integración MercadoPago con SDK mockeado
- `product.edge.test.js` — 10 casos borde (IDs inválidos, DB caída, inputs vacíos)
- `product.update.test.js` — update() y remove() con verificación de filas afectadas

## Monitoreo (Grafana Cloud + Loki)

Los logs de la aplicación se envían a **Grafana Cloud** vía Loki Push API y se visualizan en un dashboard con 7 paneles:

- **Nivel de alertas** — distribución INFO / WARN / ERROR
- **Métodos HTTP** — GET / POST / PUT / DELETE por volumen
- **Accesos por usuario** — logins por cada integrante del equipo
- **Tipo de acceso** — Login OK / Logout / Refresh Token / Token Expirado / Login Fail
- **Operaciones DB** — Query / Pool / Error en base de datos

Los generadores de logs se encuentran en `monitoring/Logs-Generator/`.

## Seguridad IaC — Checkov

```
Passed checks: 486 / 486   |   Failed: 0   |   Skipped: 4
```

Resultado del escaneo sobre `iac/tf/` con el framework Terraform. Los checks cubren configuración de KMS, S3, RDS, IAM, VPC, WAF, CloudFront, entre otros.

## Estructura del proyecto

```
Pokie_iac/
├── frontend/                  # React + Nginx
│   ├── src/
│   │   ├── pages/             # Home, AdminDashboard, Login
│   │   ├── components/        # Navbar, ProductCard, Logo, etc.
│   │   ├── context/           # AuthContext, Home (banner)
│   │   ├── hooks/useApi.js    # hooks de datos (products, orders, expenses)
│   │   └── lib/api.js         # cliente HTTP centralizado
│   ├── Dockerfile
│   └── nginx.conf
│
├── backend/                   # Node.js + Express
│   ├── src/
│   │   ├── routes/            # products, orders, expenses, auth
│   │   ├── middleware/auth.js # validación JWT
│   │   ├── db.js              # conexión PostgreSQL (pool)
│   │   ├── app.js             # configuración Express
│   │   └── index.js           # punto de entrada
│   ├── test/                  # Jest — 25 pruebas unitarias
│   └── Dockerfile
│
├── database/
│   └── init.sql               # crea tablas y seed inicial al arrancar
│
├── iac/
│   └── tf/                    # Terraform — infraestructura AWS completa
│       ├── provider.tf        # AWS provider + backend S3
│       ├── vpc.tf             # VPC, subnets, NAT Gateway
│       ├── rds.tf             # RDS PostgreSQL Multi-AZ + Proxy
│       ├── lambdas_sync.tf    # Lambdas sincrónicas (auth, products, orders, expenses)
│       ├── async_orders.tf    # SQS + Step Functions + Lambdas asíncronas
│       ├── api_gateway.tf     # API Gateway REST + WAFv2
│       ├── api_routes.tf      # rutas, métodos e integraciones
│       ├── frontend.tf        # CloudFront + S3 + OAC + failover
│       ├── s3_replication.tf  # replicación S3 cross-region
│       ├── cognito.tf         # Cognito User Pool + JWT
│       ├── security_waf.tf    # WAF reglas managed
│       ├── security_secrets.tf# KMS + Secrets Manager
│       ├── monitoring.tf      # CloudWatch + SNS + Synthetics Canary
│       ├── route53.tf         # DNS
│       ├── iam.tf             # IAM roles y políticas
│       └── variables.tf       # variables del proyecto
│
├── monitoring/                # Stack de monitoreo
│   ├── Logs-Generator/        # Generadores de logs (api-gen.js, login-gen.js, db-gen.js)
│   ├── logs/                  # Archivos de log locales (app.log, login.log, dataBase.log)
│   ├── loki-pusher.js         # Envío de logs a Grafana Cloud vía Loki Push API
│   └── pokiecat-dashboard.json# Dashboard Grafana con 7 paneles
│
├── .github/
│   └── workflows/
│       └── build.yml          # Pipeline CI/CD — 5 jobs
│
├── sonar-project.properties   # configuración SonarCloud CI
├── docker-compose.yml         # entorno local completo
└── .gitignore
```

## Ramas y flujo de trabajo

```
feature/provisioning  →  main   (infraestructura base AWS)
feature/checkov       →  main   (correcciones de seguridad IaC)
feature/testing       →  main   (pruebas unitarias Jest)
```

Los commits siguen la convención **Conventional Commits** (`feat:`, `fix:`, `ci:`, `test:`, `docs:`).

## Contributors

| Integrante | GitHub | Rol |
|-----------|--------|-----|
| Eddy Carranza | [@eddycarranza](https://github.com/eddycarranza) | Infraestructura & Backend |
| Renzo Chávez | [@RenzoCf](https://github.com/RenzoCf) | Infraestructura & Backend |
| Rodrigo García | [@rg727876-hub](https://github.com/rg727876-hub) | Infraestructura & Backend |
| Fernando Monasterio | [@Ferchitoide](https://github.com/Ferchitoide) | Infraestructura & Backend |
