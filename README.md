# lite-infra

Standalone AWS CDK infrastructure repository. Provisions the shared cloud infrastructure that application repositories deploy into.

## What this provisions

| Resource | Details |
| --- | --- |
| VPC | 2 AZs, public + private isolated subnets, no NAT gateways |
| ECR Repositories | `tasktracker-frontend`, `tasktracker-backend` |
| ECS Cluster | Fargate launch type |
| Task Definition | Single `app` container (nginx:alpine placeholder, port 80, 512 MB) |
| ECS Service | Fargate, desired count 1, min healthy 100%, max 200% |
| ALB | Internet-facing; default listener action returns HTTP 503 |
| RDS | PostgreSQL 16, db.t3.micro, private subnet, DB name `appdb` |
| Security Groups | ALB (80/443), ECS (80 from ALB), RDS (5432 from ECS) |

## Stack Outputs

App repos read these from the `LiteInfraStack` CloudFormation stack to configure their deployments:

| Output | Description |
| --- | --- |
| `VpcId` | VPC ID |
| `EcsClusterName` | ECS cluster name |
| `EcsServiceName` | ECS service name |
| `AlbDnsName` | ALB DNS name |
| `EcsSecurityGroupId` | ECS task security group ID |
| `RdsSecurityGroupId` | RDS security group ID |
| `RdsEndpoint` | RDS PostgreSQL endpoint address |
| `FrontendEcrUri` | Frontend ECR repository URI |
| `BackendEcrUri` | Backend ECR repository URI |

## Project Structure

```
lite-infra/
├── app.py                   # CDK entry point
├── cdk.json                 # CDK configuration
├── requirements.txt
├── requirements-dev.txt
├── infrastructure/
│   └── liteinfra_stack.py
└── tests/
    └── test_liteinfra_stack.py
```

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
```

## Run Tests

```bash
source .venv/bin/activate
pytest -v
```

14 tests, no AWS credentials required.

## Synthesize CloudFormation Template

```bash
source .venv/bin/activate
cdk synth
```

Generates `cdk.out/LiteInfraStack.template.json`.

## Deploy

```bash
source .venv/bin/activate
cdk deploy
```

Requires AWS credentials and CDK bootstrap (`cdk bootstrap`).

## Tear Down

```bash
cdk destroy
```
