# Ansible — Configuración y despliegue de Pokie Cat

Mientras **Terraform aprovisiona** la infraestructura (`iac/tf/`), **Ansible
configura y despliega la aplicación** encima de ella: el código de las Lambdas,
el frontend en S3/CloudFront y el esquema de la base de datos.

Como la arquitectura es *serverless*, Ansible **no se conecta por SSH** a
ningún servidor: se ejecuta en `localhost` y habla con las APIs de AWS.

## Requisitos

- **Nodo de control Linux/macOS o WSL** (Ansible no corre nativo en Windows).
- `ansible` >= 9, `python` >= 3.10, `node`/`npm`, y **AWS CLI configurado**
  (`aws configure`) con permisos sobre la cuenta.
- Terraform ya aplicado (las Lambdas, el bucket y CloudFront deben existir).

## Preparación

```bash
cd ansible
ansible-galaxy collection install -r requirements.yml -p ./collections
```

## Uso

```bash
# Todo en orden (lambdas → base de datos → frontend)
ansible-playbook playbooks/site.yml

# O por partes:
ansible-playbook playbooks/deploy_lambdas.yml     # backend/ → 4 Lambdas
ansible-playbook playbooks/deploy_frontend.yml    # React → S3 → CloudFront
ansible-playbook playbooks/init_database.yml      # esquema en RDS
```

## Playbooks

| Playbook | Qué hace |
|---|---|
| `deploy_lambdas.yml` | Empaqueta `backend/` (con `serverless-http`), actualiza el código de las 4 Lambdas, publica versión y mueve el alias `live`. |
| `deploy_frontend.yml` | Lee los outputs de Terraform, compila React con `REACT_APP_API_URL` = API Gateway, sube el build a S3 e invalida CloudFront. |
| `init_database.yml` | Lee las credenciales de Secrets Manager y ejecuta `database/init.sql` en RDS. |

### ⚠️ Nota sobre `init_database.yml`
RDS está en **subredes privadas**. El playbook necesita ruta de red al endpoint
(túnel SSM port-forwarding, bastión o VPN). Ejemplo con un túnel local:

```bash
ansible-playbook playbooks/init_database.yml -e db_host=127.0.0.1 -e db_port=5432
```
