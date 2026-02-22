import aws_cdk as cdk
from aws_cdk import assertions
from infrastructure.liteinfra_stack import LiteInfraStack


def get_template():
    app = cdk.App()
    stack = LiteInfraStack(app, "TestStack", env=cdk.Environment(region="us-east-1"))
    return assertions.Template.from_stack(stack)


# ---------------------------------------------------------------
# VPC
# ---------------------------------------------------------------
def test_vpc_created():
    template = get_template()
    template.resource_count_is("AWS::EC2::VPC", 1)


# ---------------------------------------------------------------
# RDS
# ---------------------------------------------------------------
def test_rds_instance_type_and_engine():
    template = get_template()
    template.has_resource_properties(
        "AWS::RDS::DBInstance",
        {
            "DBInstanceClass": "db.t3.micro",
            "Engine": "postgres",
            "DBName": "appdb",
        },
    )


def test_rds_not_publicly_accessible():
    template = get_template()
    template.has_resource_properties(
        "AWS::RDS::DBInstance",
        {
            "PubliclyAccessible": False,
        },
    )


def test_rds_security_group_allows_postgres_from_ecs():
    template = get_template()
    template.has_resource_properties(
        "AWS::EC2::SecurityGroup",
        {
            "GroupDescription": "Allow PostgreSQL access from ECS",
            "SecurityGroupIngress": assertions.Match.absent(),
        },
    )
    template.has_resource_properties(
        "AWS::EC2::SecurityGroupIngress",
        {
            "IpProtocol": "tcp",
            "FromPort": 5432,
            "ToPort": 5432,
        },
    )


# ---------------------------------------------------------------
# ECR
# ---------------------------------------------------------------
def test_ecr_repositories_created():
    template = get_template()
    template.has_resource_properties(
        "AWS::ECR::Repository",
        {"RepositoryName": "tasktracker-frontend"},
    )
    template.has_resource_properties(
        "AWS::ECR::Repository",
        {"RepositoryName": "tasktracker-backend"},
    )


# ---------------------------------------------------------------
# ECS Cluster
# ---------------------------------------------------------------
def test_ecs_cluster_created():
    template = get_template()
    template.resource_count_is("AWS::ECS::Cluster", 1)


# ---------------------------------------------------------------
# ECS Task Definition
# ---------------------------------------------------------------
def test_ecs_task_definition_has_single_app_container():
    template = get_template()
    template.has_resource_properties(
        "AWS::ECS::TaskDefinition",
        {
            "RequiresCompatibilities": ["FARGATE"],
            "NetworkMode": "awsvpc",
            "ContainerDefinitions": assertions.Match.array_with(
                [
                    assertions.Match.object_like(
                        {
                            "Name": "app",
                            "Image": "nginx:alpine",
                            "Memory": 512,
                            "PortMappings": [
                                {"ContainerPort": 80},
                            ],
                        }
                    ),
                ]
            ),
        },
    )


def test_ecs_task_definition_has_exactly_one_container():
    template = get_template()
    resources = template.to_json()["Resources"]
    task_defs = [
        r for r in resources.values()
        if r["Type"] == "AWS::ECS::TaskDefinition"
    ]
    assert len(task_defs) == 1
    containers = task_defs[0]["Properties"]["ContainerDefinitions"]
    assert len(containers) == 1


# ---------------------------------------------------------------
# ALB
# ---------------------------------------------------------------
def test_alb_created():
    template = get_template()
    template.has_resource_properties(
        "AWS::ElasticLoadBalancingV2::LoadBalancer",
        {
            "Scheme": "internet-facing",
        },
    )


def test_alb_listener_forwards_to_app_target_group():
    template = get_template()
    template.has_resource_properties(
        "AWS::ElasticLoadBalancingV2::Listener",
        {
            "DefaultActions": assertions.Match.array_with(
                [
                    assertions.Match.object_like(
                        {
                            "Type": "forward",
                        }
                    ),
                ]
            ),
        },
    )


# ---------------------------------------------------------------
# Target Group
# ---------------------------------------------------------------
def test_app_target_group_created():
    template = get_template()
    template.has_resource_properties(
        "AWS::ElasticLoadBalancingV2::TargetGroup",
        {
            "Port": 80,
            "Protocol": "HTTP",
            "TargetType": "ip",
            "HealthCheckPath": "/",
            "HealthCheckIntervalSeconds": 30,
        },
    )


# ---------------------------------------------------------------
# ECS Service
# ---------------------------------------------------------------
def test_ecs_service_created():
    template = get_template()
    template.resource_count_is("AWS::ECS::Service", 1)


def test_ecs_service_linked_to_target_group():
    template = get_template()
    template.has_resource_properties(
        "AWS::ECS::Service",
        {
            "LoadBalancers": assertions.Match.array_with(
                [
                    assertions.Match.object_like(
                        {
                            "ContainerName": "app",
                            "ContainerPort": 80,
                        }
                    ),
                ]
            ),
        },
    )


def test_ecs_service_deployment_config():
    template = get_template()
    template.has_resource_properties(
        "AWS::ECS::Service",
        {
            "DesiredCount": 1,
            "LaunchType": "FARGATE",
            "DeploymentConfiguration": {
                "MinimumHealthyPercent": 100,
                "MaximumPercent": 200,
            },
        },
    )


def test_ecs_security_group_allows_only_port_80_from_alb():
    template = get_template()
    resources = template.to_json()["Resources"]
    sg_ingress_resources = [
        r["Properties"]
        for r in resources.values()
        if r["Type"] == "AWS::EC2::SecurityGroupIngress"
    ]
    ports_3001 = [
        r for r in sg_ingress_resources
        if r.get("FromPort") == 3001 or r.get("ToPort") == 3001
    ]
    assert len(ports_3001) == 0, f"Found unexpected port 3001 ingress rules: {ports_3001}"


# ---------------------------------------------------------------
# Stack Outputs
# ---------------------------------------------------------------
def test_outputs_exist():
    template = get_template()
    outputs = template.to_json()["Outputs"]
    output_keys = list(outputs.keys())

    assert any("VpcId" in k for k in output_keys), "Missing VpcId output"
    assert any("EcsClusterName" in k for k in output_keys), "Missing EcsClusterName output"
    assert any("EcsServiceName" in k for k in output_keys), "Missing EcsServiceName output"
    assert any("AlbDnsName" in k for k in output_keys), "Missing AlbDnsName output"
    assert any("EcsSecurityGroupId" in k for k in output_keys), "Missing EcsSecurityGroupId output"
    assert any("RdsSecurityGroupId" in k for k in output_keys), "Missing RdsSecurityGroupId output"
    assert any("RdsEndpoint" in k for k in output_keys), "Missing RdsEndpoint output"
    assert any("FrontendEcrUri" in k for k in output_keys), "Missing FrontendEcrUri output"
    assert any("BackendEcrUri" in k for k in output_keys), "Missing BackendEcrUri output"
    assert any("HttpListenerArn" in k for k in output_keys), "Missing HttpListenerArn output"
    assert any("AppTargetGroupArn" in k for k in output_keys), "Missing AppTargetGroupArn output"
