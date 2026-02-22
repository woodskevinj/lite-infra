# lite-infra — CDK Infrastructure

AWS CDK app (Python) that defines the `LiteInfraStack` CloudFormation stack. App repositories deploy their containers into the ECS service this stack provisions and register ALB listener rules at deploy time.

## Stack: `LiteInfraStack`

### Architecture

```
                     ┌──────────────────────────────────────────────┐
                     │  VPC (2 AZs, us-east-1)                      │
                     │                                              │
Internet ──▶ ALB     │  ┌─────────────────┐  ┌──────────────────┐  │
         (:80, 503)  │  │  Public Subnets  │  │  Private Subnets  │  │
                     │  │                 │  │                  │  │
                     │  │  ┌───────────┐  │  │  ┌────────────┐  │  │
                     │  │  │ ECS Task  │  │  │  │ RDS        │  │  │
                     │  │  │ app :80   │  │  │  │ PostgreSQL │  │  │
                     │  │  │ (nginx)   │  │  │  │ appdb      │  │  │
                     │  │  └───────────┘  │  │  └────────────┘  │  │
                     │  └─────────────────┘  └──────────────────┘  │
                     └──────────────────────────────────────────────┘

ECR: tasktracker-frontend  (app repos push real images here)
ECR: tasktracker-backend   (app repos push real images here)
```

### Resources

| Resource | Logical ID | Details |
| --- | --- | --- |
| VPC | `LiteInfraVpc` | 2 AZs, public + private isolated subnets, no NAT gateways |
| ECR Frontend | `FrontendRepo` | Physical name: `tasktracker-frontend` |
| ECR Backend | `BackendRepo` | Physical name: `tasktracker-backend` |
| ECS Cluster | `LiteInfraCluster` | Fargate |
| Task Definition | `LiteInfraTaskDef` | 256 CPU / 512 MB; 1 container (`app`, nginx:alpine, port 80) |
| ECS Service | `LiteInfraService` | Fargate, desired 1, min healthy 100%, max 200% |
| ALB | `LiteInfraAlb` | Internet-facing; default action: fixed 503 |
| RDS Instance | `LiteInfraDb` | PostgreSQL 16, db.t3.micro, DB name `appdb` |
| ALB SG | `AlbSecurityGroup` | Inbound: 80, 443 from 0.0.0.0/0 |
| ECS SG | `EcsSecurityGroup` | Inbound: 80 from ALB SG |
| RDS SG | `RdsSecurityGroup` | Inbound: 5432 from ECS SG |

### Outputs

| Output | Value |
| --- | --- |
| `VpcId` | VPC ID |
| `EcsClusterName` | ECS cluster name |
| `EcsServiceName` | ECS service name |
| `AlbDnsName` | ALB DNS name |
| `EcsSecurityGroupId` | ECS task security group ID |
| `RdsSecurityGroupId` | RDS security group ID |
| `RdsEndpoint` | RDS PostgreSQL endpoint address |
| `FrontendEcrUri` | `tasktracker-frontend` repository URI |
| `BackendEcrUri` | `tasktracker-backend` repository URI |

## Project Structure

```
infrastructure/
├── app.py                      # CDK app entry point (us-east-1)
├── cdk.json                    # CDK configuration
├── requirements.txt            # Runtime dependencies
├── requirements-dev.txt        # Test dependencies (pytest)
├── infrastructure/
│   ├── __init__.py
│   └── liteinfra_stack.py      # Stack definition
└── tests/
    ├── __init__.py
    └── test_liteinfra_stack.py # 14 tests
```

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
```

## Testing

```bash
source .venv/bin/activate
pytest -v
```

14 tests using `aws_cdk.assertions.Template`. No AWS account or credentials needed.

### Test Coverage

- VPC created
- RDS: db.t3.micro, postgres engine, DB name `appdb`
- RDS not publicly accessible
- RDS security group allows port 5432 from ECS security group
- ECR repositories created (`tasktracker-frontend`, `tasktracker-backend`)
- ECS cluster created
- Task definition has single `app` container (nginx:alpine, port 80, 512 MB)
- Task definition has exactly one container
- ALB is internet-facing
- ALB listener default action is fixed response HTTP 503
- ECS service created
- ECS service: Fargate, min healthy 100%, max 200%
- ECS security group has no port 3001 ingress rules
- All 9 stack outputs present

## Synthesize CloudFormation Template

```bash
source .venv/bin/activate
cdk synth
```

Generates `cdk.out/LiteInfraStack.template.json`. Requires the CDK CLI (`npm install -g aws-cdk`).

## Deploy

```bash
source .venv/bin/activate
cdk deploy
```

Requires AWS credentials and a bootstrapped CDK environment (`cdk bootstrap`).

## Design Notes

**ALB default action is HTTP 503.** The base stack registers no target groups. App repos add listener rules (with priorities) at their own deploy time, routing traffic to their task definition revision.

**Placeholder image.** The task definition uses `nginx:alpine` so the ECS service starts healthy on first deploy without requiring ECR pushes. App repos register a new task definition revision with ECR image URIs when they deploy.

**No NAT gateways.** Tasks run in public subnets with `assign_public_ip=True` so they can pull images from ECR and Docker Hub without NAT. RDS lives in private isolated subnets and is not publicly accessible.

**Zero-downtime deployment.** `min_healthy_percent=100` / `max_healthy_percent=200` ensures the old task stays up until the new one passes health checks.
