# Infraestructura — Terraform (AWS)

Infraestructura completa de Pokie Cat definida como código con Terraform. Despliega una arquitectura serverless en AWS.

## Estructura

```
iac/tf/
├── provider.tf          # AWS provider, región y backend remoto (S3)
├── variables.tf         # Variables del proyecto (nombre, región, dominio)
├── outputs.tf           # Outputs útiles tras el apply
│
├── vpc.tf               # VPC, subnets públicas/privadas, NAT Gateway
├── rds.tf               # RDS PostgreSQL Multi-AZ + RDS Proxy
│
├── lambdas_sync.tf      # Lambdas sincrónicas: auth, products, orders, expenses
├── async_orders.tf      # SQS + Step Functions + Lambdas asíncronas de pedidos
│
├── api_gateway.tf       # API Gateway REST + WAFv2 + etapa prod
├── api_routes.tf        # Rutas, métodos, integraciones Lambda-proxy y CORS
│
├── frontend.tf          # CloudFront + S3 (origen primario + failover) + OAC
├── s3_replication.tf    # Replicación S3 cross-region para alta disponibilidad
│
├── cognito.tf           # Cognito User Pool + autorizador JWT en API Gateway
├── security_waf.tf      # WAF reglas managed (OWASP, Log4j, IP anónimas)
├── security_secrets.tf  # KMS key + Secrets Manager (credenciales RDS)
│
├── monitoring.tf        # CloudWatch Alarms + SNS + Synthetics Canary + Dashboard
├── route53.tf           # DNS — registro A apuntando a CloudFront
│
├── am.tf                # IAM roles y políticas para Lambda, Step Functions, Canary
├── archives.tf          # data sources para empaquetar código Lambda en ZIP
│
├── lambda_src/          # Código fuente placeholder de las Lambdas
└── canary_src/          # Código fuente del Synthetics Canary
```

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
