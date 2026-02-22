# Task Tracker

A full-stack task management application for creating projects and tracking tasks within them. Built with React, Express.js, and PostgreSQL, deployed on ECS Fargate (serverless container compute) with AWS infrastructure defined in CDK.

## Tech Stack

| Layer          | Technology                                                 |
| -------------- | ---------------------------------------------------------- |
| Frontend       | React (Vite) + Tailwind CSS                                |
| Backend        | Express.js + raw SQL via `pg`                              |
| Database       | PostgreSQL                                                 |
| Infrastructure | AWS CDK (Python) — VPC, RDS, ECS Fargate, ECR, ALB         |
| Testing        | Vitest (frontend), Jest (backend), pytest (infrastructure) |

## Project Structure

```
tasktracker/
├── frontend/          # React SPA
├── backend/           # Express.js API server
├── infrastructure/    # AWS CDK app (Python)
└── deploy.sh          # Build, push, and deploy to ECS
```

Each directory is self-contained with its own README, dependencies, and tests. See the individual READMEs for detailed setup and usage:

- [Frontend README](frontend/README.md)
- [Backend README](backend/README.md)
- [Infrastructure README](infrastructure/README.md)

## Quick Start

### Prerequisites

- Node.js (v18+)
- Python 3.8+ (for infrastructure only)
- Docker (for building and deploying)
- AWS CLI (configured with credentials)
- `jq` (for the deploy script)

### Run the app locally

```bash
# Terminal 1 — Backend (port 3001)
cd backend
npm install
node server.js

# Terminal 2 — Frontend (port 5173, proxies /api to backend)
cd frontend
npm install
npm run dev
```

### Run all tests

```bash
# Backend — 16 tests
cd backend && npm install && npm test

# Frontend — 17 tests
cd frontend && npm install && npx vitest run

# Infrastructure — 11 tests
cd infrastructure && source .venv/bin/activate && pytest
```

## Deploy to AWS

The CDK stack provisions the infrastructure (VPC, RDS, ECS Fargate cluster, ECR repos, ALB). The `deploy.sh` script builds the app containers, pushes them to ECR, and updates the ECS Fargate service.

```bash
# 1. Deploy infrastructure (first time only)
cd infrastructure
cdk deploy

# 2. Build images and deploy to ECS
cd ..
./deploy.sh
```

The script will:

1. Discover ECS cluster/service names from CloudFormation
2. Log in to ECR
3. Build and push the frontend and backend Docker images
4. Register a new ECS task definition revision with the ECR image URIs
5. Update the ECS Fargate service with `--force-new-deployment`

On subsequent deploys, just run `./deploy.sh` again.

## Tear Down

To remove all AWS resources created by this project:

```bash
cd infrastructure
cdk destroy
```

This will delete the entire CloudFormation stack, including:

- **ECS Fargate** — cluster, Fargate service, and task definitions (no EC2 instances to terminate)
- **ECR** — both repositories and all pushed images (`empty_on_delete` is enabled)
- **ALB** — load balancer, listeners, and target groups
- **RDS** — the PostgreSQL database instance and its data (`deletion_protection` is off)
- **VPC** — subnets, route tables, internet gateway, and security groups
- **IAM** — roles and policies created for ECS Fargate task execution
- **CloudWatch** — log groups created by ECS task logging

CDK will prompt for confirmation before proceeding. The teardown typically takes 5-10 minutes as AWS deprovisions resources in dependency order (ECS Fargate service stops first, then the cluster, then networking).

> **Note:** The Secrets Manager secret created by RDS may be retained with a scheduled deletion window (default 30 days). You can delete it immediately from the AWS console or with `aws secretsmanager delete-secret --secret-id <secret-arn> --force-delete-without-recovery`.

## Known Limitations

- **Database integration is not yet implemented.** The CDK stack provisions an RDS PostgreSQL instance and passes connection credentials to the backend via environment variables and Secrets Manager, but the application does not currently perform database migrations or persist data. All API responses are served from in-memory state. Full CRUD operations backed by PostgreSQL are planned for a future release.

## Current Status

- **Phase 1 (complete):** Frontend and backend built with full test suites. The backend returns structured JSON error responses when no database is connected and the frontend handles these gracefully.
- **Phase 2 (complete):** AWS infrastructure defined in CDK — VPC, RDS PostgreSQL, ECS Fargate, ECR, ALB, and stack outputs. All tests passing.
- **Phase 3 (complete):** Containerized frontend and backend with a deploy script for building, pushing, and deploying to ECS Fargate.

## Up Next

- **Database migration** — Run `schema.sql` against the RDS instance to create the `projects` and `tasks` tables
- **Backend persistence** — Connect the Express API to PostgreSQL so CRUD operations read and write to RDS instead of in-memory state
- **CI/CD pipeline** — Automate image builds, pushes, and ECS deployments on merge to `main`
