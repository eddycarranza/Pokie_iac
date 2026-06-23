variable "aws_region" {
  description = "Región de AWS donde se despliega Pokie Cat"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
  default     = "pokiecat"
}

variable "environment" {
  description = "Entorno de despliegue"
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = "Dominio de la tienda"
  type        = string
  default     = "pookiecat.pe"
}

variable "db_username" {
  description = "Usuario administrador de RDS"
  type        = string
  default     = "pokiecat_admin"
}

# Fix CKV_SECRET_6 (secret scanner): sin default hardcodeado. El valor real
# se pasa por -var, un .auto.tfvars (no versionado, ver .gitignore) o una
# variable de entorno TF_VAR_db_password en el pipeline de CI/CD.
variable "db_password" {
  description = "Password de RDS. Se inyecta en runtime (TF_VAR_db_password o -var), nunca hardcodeado."
  type        = string
  sensitive   = true
}

variable "vpc_cidr" {
  description = "CIDR de la VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Fix CKV_AWS_144: región secundaria para la réplica cross-region de los
# buckets S3 (frontend, access_logs, canary_artifacts, cloudtrail_logs).
variable "replica_region" {
  description = "Región de AWS donde se replican los buckets S3 para DR"
  type        = string
  default     = "us-west-2"
}
