# Infraestructura — Terraform (AWS)

Infraestructura completa de Pokie Cat definida como código con Terraform. Despliega una arquitectura serverless en AWS.

## Estructura

```
iac/tf/
├── provider.tf             # AWS provider, región y backend remoto (S3)
├── variables.tf            # Variables del proyecto (nombre, región, dominio)
├── outputs.tf              # Outputs útiles tras el apply
│
├── vpc.tf                  # VPC, subnets públicas/privadas, NAT Gateway
├── rds.tf                  # RDS PostgreSQL Multi-AZ + RDS Proxy
│
├── lambdas_sync.tf         # Lambdas sincrónicas: auth, products, orders, expenses
├── async_orders.tf         # SQS + Step Functions + Lambdas asíncronas de pedidos
│
├── api_gateway.tf          # API Gateway REST + WAFv2 + etapa prod
├── api_routes.tf           # Rutas, métodos, integraciones Lambda-proxy y CORS
│
├── frontend.tf             # CloudFront + S3 (origen primario + failover) + OAC
├── s3_replication.tf       # Replicación S3 cross-region para alta disponibilidad
│
├── cognito.tf              # Cognito User Pool + autorizador JWT en API Gateway
├── security_waf.tf         # WAF reglas managed (OWASP, Log4j, IP anónimas)
├── security_secrets.tf     # KMS key + Secrets Manager (credenciales RDS)
│
├── monitoring.tf           # CloudWatch Alarms + SNS + Synthetics Canary + Dashboard
├── cost_optimization.tf    # ★ Semana 14: Budgets + Dashboard rendimiento + ARM64
├── route53.tf              # DNS — registro A apuntando a CloudFront
│
├── am.tf                   # IAM roles y políticas para Lambda, Step Functions, Canary
├── archives.tf             # data sources para empaquetar código Lambda en ZIP
│
├── lambda_src/             # Código fuente placeholder de las Lambdas
└── canary_src/             # Código fuente del Synthetics Canary
```

## Optimización de Costos y Rendimiento (Semana 14)

Estrategias implementadas en el Terraform para minimizar costos en AWS:

| Estrategia | Recurso Terraform | Ahorro estimado |
|---|---|---|
| **Lambda ARM64 (Graviton2)** | `architectures = ["arm64"]` en todos los `aws_lambda_function` | 20 % menos por GB-segundo |
| **Lambda serverless (pago por uso)** | Sin EC2 ni contenedores corriendo 24/7 | Se paga solo cuando hay peticiones |
| **Concurrencia aprovisionada = 0** | `var.provisioned_concurrency = 0` | $0 de costo base en Lambda |
| **S3 + CloudFront para frontend** | `frontend.tf` | ~$0.01/GB vs $0.09/GB de EC2+ELB |
| **Lifecycle S3** | Expira versiones viejas a 90 días, elimina uploads incompletos en 7 días | Reduce costo de almacenamiento |
| **Logs a 365 días (no infinito)** | `retention_in_days = 365` | Evita acumulación de CloudWatch Logs |
| **RDS gp3** | `storage_type = "gp3"` | 20 % más barato que gp2 con mismos IOPS |
| **db.t3.medium** | `instance_class = "db.t3.medium"` | Instancia adecuada al tamaño del proyecto |
| **SQS para pedidos** | Cola desacoplada en `async_orders.tf` | Evita sobredimensionar Lambdas |
| **Geo-restriction a Perú** | `locations = ["PE"]` en CloudFront | Reduce tráfico CDN internacional |
| **AWS Budgets** | `aws_budgets_budget.monthly` en `cost_optimization.tf` | Alerta automática al 80 % y 100 % |

Para evaluar el rendimiento de la infraestructura, el proyecto incluye un **CloudWatch Dashboard** (`aws_cloudwatch_dashboard.performance`) que consolida:
- Duración y errores de cada Lambda (ms)
- Latencia P99 del API Gateway
- Conexiones activas a RDS
- Cache Hit Rate de CloudFront

## Análisis de seguridad (Checkov)

```bash
# Correr Checkov contra el Terraform
docker run --rm -v ./iac/tf:/tf bridgecrew/checkov:3 --directory /tf --compact

# Ver solo los que fallan
docker run --rm -v ./iac/tf:/tf bridgecrew/checkov:3 --directory /tf --compact 2>&1 | Select-String "FAILED"
```

Los resultados de Checkov (`results.xml`) están en `.gitignore` y no se commitean.

## Flujo de trabajo

1. Hacer el fix en `feature/checkov`
2. Correr Checkov localmente para verificar que pasa
3. Push + PR a `main`
4. Esperar que SonarCloud apruebe
5. Mergear

## Despliegue en AWS

```bash
cd iac/tf
terraform init
terraform plan
terraform apply
```

> Requiere credenciales AWS configuradas y un bucket S3 para el backend remoto de Terraform.
