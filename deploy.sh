#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="TasktrackerStack"
REGION=$(aws configure get region)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

FRONTEND_REPO="tasktracker-frontend"
BACKEND_REPO="tasktracker-backend"
FRONTEND_IMAGE="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${FRONTEND_REPO}:latest"
BACKEND_IMAGE="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${BACKEND_REPO}:latest"

echo "=== Discovering ECS resources from CloudFormation stack: ${STACK_NAME} ==="

CLUSTER_ARN=$(aws cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --query "StackResources[?ResourceType=='AWS::ECS::Cluster'].PhysicalResourceId | [0]" \
  --output text)

SERVICE_NAME=$(aws cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --query "StackResources[?ResourceType=='AWS::ECS::Service'].PhysicalResourceId | [0]" \
  --output text)

# The service physical ID is "cluster-name/service-name" — extract just the service name
SERVICE_NAME="${SERVICE_NAME##*/}"

TASK_DEF_FAMILY=$(aws cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --query "StackResources[?ResourceType=='AWS::ECS::TaskDefinition'].PhysicalResourceId | [0]" \
  --output text)

# The physical ID is the full task def ARN — extract the family name (without revision)
TASK_DEF_FAMILY=$(echo "$TASK_DEF_FAMILY" | awk -F'/' '{print $2}' | awk -F':' '{print $1}')

echo "  Cluster: ${CLUSTER_ARN}"
echo "  Service: ${SERVICE_NAME}"
echo "  Task Definition Family: ${TASK_DEF_FAMILY}"

echo ""
echo "=== Logging in to ECR ==="
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo ""
echo "=== Building and pushing frontend ==="
docker build -t "${FRONTEND_REPO}:latest" ./frontend
docker tag "${FRONTEND_REPO}:latest" "$FRONTEND_IMAGE"
docker push "$FRONTEND_IMAGE"

echo ""
echo "=== Building and pushing backend ==="
docker build -t "${BACKEND_REPO}:latest" ./backend
docker tag "${BACKEND_REPO}:latest" "$BACKEND_IMAGE"
docker push "$BACKEND_IMAGE"

echo ""
echo "=== Registering new task definition revision ==="

# Fetch the current task definition
TASK_DEF_JSON=$(aws ecs describe-task-definition \
  --task-definition "$TASK_DEF_FAMILY" \
  --query "taskDefinition")

# Replace placeholder images with ECR URIs and strip fields that can't be re-registered
NEW_TASK_DEF=$(echo "$TASK_DEF_JSON" | jq \
  --arg frontend_image "$FRONTEND_IMAGE" \
  --arg backend_image "$BACKEND_IMAGE" \
  '
  .containerDefinitions |= map(
    if .name == "frontend" then .image = $frontend_image
    elif .name == "backend" then .image = $backend_image | del(.command)
    else .
    end
  )
  | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)
  ')

NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
  --cli-input-json "$NEW_TASK_DEF" \
  --query "taskDefinition.taskDefinitionArn" \
  --output text)

echo "  New task definition: ${NEW_TASK_DEF_ARN}"

echo ""
echo "=== Updating ECS service ==="
aws ecs update-service \
  --cluster "$CLUSTER_ARN" \
  --service "$SERVICE_NAME" \
  --task-definition "$NEW_TASK_DEF_ARN" \
  --force-new-deployment \
  --query "service.deployments[0].{Status:status,Running:runningCount,Desired:desiredCount}" \
  --output table

ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='AlbDnsName'].OutputValue" \
  --output text)

echo ""
echo "=== Deployment triggered successfully ==="
echo "Task definition: ${NEW_TASK_DEF_ARN}"
echo "Application URL: http://${ALB_DNS}"
echo "Monitor with: aws ecs describe-services --cluster ${CLUSTER_ARN} --services ${SERVICE_NAME} --query 'services[0].deployments'"
