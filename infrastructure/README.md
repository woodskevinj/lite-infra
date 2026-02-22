# Task Tracker — Infrastructure

AWS CDK app (Python) that defines the cloud infrastructure for the Task Tracker application. Uses ECS Fargate (serverless compute) to run the frontend and backend as Docker containers behind an Application Load Balancer.

## Tech Stack

- **IaC:** AWS CDK v2 (Python)
- **Language:** Python 3.8+
- **Testing:** pytest + aws_cdk.assertions

## Architecture

```
                         ┌─────────────────────────────────────────────────────┐
                         │  VPC (2 AZs, us-east-1)                            │
                         │                                                     │
Internet ──▶ ALB (:80)   │  ┌───────────────────────┐  ┌───────────────────┐  │
              │          │  │  Public Subnets         │  │  Private Subnets   │  │
              │          │  │                         │  │                   │  │
              ├─ /api/* ─┼──┤  ┌───────────────────┐  │  │  ┌─────────────┐  │  │
              │          │  │  │ ECS Fargate Task  │  │  │  │ RDS         │  │  │
              │          │  │  │ (0.25 vCPU/512MB) │  │  │  │ PostgreSQL  │  │  │
              │          │  │  │                   │  │  │  │ db.t3.micro │  │  │
              │          │  │  │ ┌───────────────┐ │──┼──┼─▶│ tasktracker │  │  │
              │          │  │  │ │ backend :3001 │ │  │  │  └─────────────┘  │  │
              │          │  │  │ └───────────────┘ │  │  │  Not publicly     │  │
              └─ /* ─────┼──┤  │ ┌───────────────┐ │  │  │  accessible       │  │
                         │  │  │ │ frontend :80  │ │  │  │                   │  │
                         │  │  │ └───────────────┘ │  │  │                   │  │
                         │  │  └───────────────────┘  │  │                   │  │
                         │  └───────────────────────┘  └───────────────────┘  │
                         └─────────────────────────────────────────────────────┘

ECR: tasktracker-frontend ──▶ frontend container (:80, nginx + React SPA)
ECR: tasktracker-backend  ──▶ backend container (:3001, Express.js)
```

## Resources

| Resource | Type | Details |
| --- | --- | --- |
| VPC | `AWS::EC2::VPC` | 2 AZs, public + private isolated subnets, no NAT gateways |
| ECR Repositories | `AWS::ECR::Repository` | `tasktracker-frontend` and `tasktracker-backend` |
| ECS Cluster | `AWS::ECS::Cluster` | Fargate launch type |
| Task Definition | `AWS::ECS::TaskDefinition` | awsvpc networking, 256 CPU / 512 MB, 2 containers (frontend:80, backend:3001), placeholder images |
| ECS Service | `AWS::ECS::Service` | Fargate, desired count 1, min healthy 0%, public subnet, public IP assigned |
| ALB | `AWS::ElasticLoadBalancingV2::LoadBalancer` | Internet-facing, path-based routing |
| RDS Instance | `AWS::RDS::DBInstance` | db.t3.micro, PostgreSQL 16, private subnet, DB name `tasktracker` |
| ALB Security Group | `AWS::EC2::SecurityGroup` | Inbound: 80 (HTTP), 443 (HTTPS) from 0.0.0.0/0 |
| ECS Security Group | `AWS::EC2::SecurityGroup` | Inbound: 80, 3001 from ALB SG; attaches to Fargate task ENI |
| RDS Security Group | `AWS::EC2::SecurityGroup` | Inbound: 5432 from ECS SG only |

## ALB Routing

| Path | Target | Port |
| --- | --- | --- |
| `/health` | Backend container (health check only) | 3001 |
| `/api/*` | Backend container | 3001 |
| `/*` (default) | Frontend container | 80 |

Fargate tasks use `awsvpc` network mode — each task gets its own ENI. Containers within the same task share a network namespace, so the frontend nginx config can still proxy `/api/` to `localhost:3001`.

## Backend Environment Variables

The backend container receives RDS connection details at runtime:

| Variable | Source |
| --- | --- |
| `DB_HOST` | RDS endpoint address |
| `DB_PORT` | RDS endpoint port |
| `DB_NAME` | `tasktracker` (static) |
| `DB_USER` | Secrets Manager (auto-generated) |
| `DB_PASSWORD` | Secrets Manager (auto-generated) |
| `PORT` | `3001` (static) |

## Deployment Notes

**Placeholder images:** The task definition uses `nginx:alpine` (frontend) and `node:20-alpine` (backend) as placeholder images so the ECS service stabilizes on first deploy without needing images pushed to ECR. The backend container includes a `command` override that starts a minimal Node.js HTTP server on port 3001 (returns `[]` for any request) — without this, `node:20-alpine` exits immediately (its default command is the Node REPL), which kills the entire task since both containers are essential. Update the task definition to use ECR images after pushing real builds.

**Memory:** Each container has a 256 MiB hard limit (256 + 256 = 512 MiB), matching the task-level memory limit of 512 MiB. The task is allocated 0.25 vCPU (256 CPU units).

**Networking:** Tasks run in public subnets with `assign_public_ip=True`. This is required because there is no NAT gateway — tasks need a public IP to pull images from ECR and Docker Hub, and to reach Secrets Manager.

**Zero-downtime deployment:** The service sets `min_healthy_percent=100` and `max_healthy_percent=200` so ECS starts the new task and waits for it to pass health checks before stopping the old one. This eliminates the 503 window during deployments — both tasks briefly serve traffic simultaneously, then the old one is stopped once the new one is healthy. The backend health check uses a 10-second interval with a threshold of 2 consecutive successes (20 seconds to go healthy) rather than the ALB default of 30s × 5 = 150 seconds.

## Stack Outputs

| Output | Description |
| --- | --- |
| `AlbDnsName` | Application Load Balancer DNS name |
| `RdsEndpoint` | RDS PostgreSQL endpoint address |
| `RdsSecurityGroupId` | RDS security group ID |
| `FrontendEcrUri` | Frontend ECR repository URI |
| `BackendEcrUri` | Backend ECR repository URI |

## Project Structure

```
infrastructure/
├── app.py                      # CDK app entry point (us-east-1)
├── cdk.json                    # CDK configuration
├── requirements.txt            # Python dependencies
├── requirements-dev.txt        # Test dependencies (pytest)
├── infrastructure/
│   ├── __init__.py
│   └── tasktracker_stack.py    # Main stack definition
└── tests/
    ├── __init__.py
    └── test_tasktracker_stack.py
```

## Setup

```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements-dev.txt
```

## Testing

```bash
source .venv/bin/activate
pytest -v
```

Runs 11 tests using `aws_cdk.assertions.Template`. No AWS account or credentials needed.

### Test Coverage

- VPC is created
- RDS instance type (`db.t3.micro`), engine (`postgres`), and database name (`tasktracker`)
- RDS is not publicly accessible
- RDS security group allows port 5432 from ECS security group
- ECR repositories created (`tasktracker-frontend`, `tasktracker-backend`)
- ECS cluster created
- Task definition has 2 containers (frontend on port 80, backend on port 3001) with awsvpc networking, Fargate compatibility, 256 CPU / 512 MB memory, placeholder images, and per-container memory limits
- ALB is internet-facing
- ECS service created
- ECS service deployment config: Fargate launch type, min healthy 0%, max 100%
- Stack outputs exist (ALB DNS, RDS endpoint, RDS SG ID, ECR URIs)

## Synthesize CloudFormation Template

```bash
source .venv/bin/activate
cdk synth
```

Generates the CloudFormation template in `cdk.out/`. Requires the AWS CDK CLI (`npm install -g aws-cdk`).

## Deployment (future)

Deployment is not part of this phase. When ready:

```bash
cdk deploy
```

This requires AWS credentials configured and the CDK CLI bootstrapped in the target account/region.
