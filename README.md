# Pokie Cat — Infraestructura como Código

E-commerce de ropa con arquitectura serverless en AWS, desplegada con Terraform. Incluye entorno local completo con Docker Compose para desarrollo y pruebas.

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
```

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
│       ├── am.tf              # IAM roles y políticas
│       └── variables.tf       # variables del proyecto
│
├── ansible/                   # Automatización de despliegue
│   ├── playbooks/             # deploy_frontend, deploy_lambdas, init_database
│   ├── inventory.ini
│   └── ansible.cfg
│
├── monitoring/                # Stack de monitoreo local
│   ├── docker-compose.yml     # Prometheus + Grafana
│   └── prometheus.yml
│
├── sonarqube-lab/             # Análisis de calidad de código local
│   └── docker-compose.yml     # SonarQube + SonarScanner
│
├── sonar-project.properties   # configuración SonarCloud CI
├── docker-compose.yml         # entorno local completo
└── .gitignore
```

## Ramas y flujo de trabajo

```
feature/checkov  →  PR  →  main
```

Cada fix de Checkov va en `feature/checkov`, se abre PR y se espera que SonarCloud pase antes de mergear.

## Contributors

| Usuario | Rol |
|--------|-----|
| [@eddycarranza](https://github.com/eddycarranza) | Infraestructura & Backend |
| [@RenzoCf](https://github.com/RenzoCf) | Infraestructura & Backend |
| [@rg727876-hub](https://github.com/rg727876-hub) | Infraestructura & Backend |
| [@Ferchitoide](https://github.com/Ferchitoide) | Infraestructura & Backend |
