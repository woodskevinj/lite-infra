from aws_cdk import (
    Stack,
    RemovalPolicy,
    CfnOutput,
    Duration,
    aws_ec2 as ec2,
    aws_rds as rds,
    aws_ecr as ecr,
    aws_ecs as ecs,
    aws_elasticloadbalancingv2 as elbv2,
)
from constructs import Construct


class LiteInfraStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ---------------------------------------------------------------
        # VPC
        # ---------------------------------------------------------------
        vpc = ec2.Vpc(
            self,
            "LiteInfraVpc",
            max_azs=2,
            nat_gateways=0,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24,
                ),
                ec2.SubnetConfiguration(
                    name="Private",
                    subnet_type=ec2.SubnetType.PRIVATE_ISOLATED,
                    cidr_mask=24,
                ),
            ],
        )

        # ---------------------------------------------------------------
        # ECR Repositories
        # ---------------------------------------------------------------
        frontend_repo = ecr.Repository(
            self,
            "FrontendRepo",
            repository_name="tasktracker-frontend",
            removal_policy=RemovalPolicy.DESTROY,
            empty_on_delete=True,
        )

        backend_repo = ecr.Repository(
            self,
            "BackendRepo",
            repository_name="tasktracker-backend",
            removal_policy=RemovalPolicy.DESTROY,
            empty_on_delete=True,
        )

        visionsense_repo = ecr.Repository(
            self,
            "VisionSenseApiRepo",
            repository_name="visionsense-api",
            removal_policy=RemovalPolicy.DESTROY,
            empty_on_delete=True,
        )

        # ---------------------------------------------------------------
        # Security Groups
        # ---------------------------------------------------------------
        alb_sg = ec2.SecurityGroup(
            self,
            "AlbSecurityGroup",
            vpc=vpc,
            description="Allow HTTP and HTTPS to ALB",
            allow_all_outbound=True,
        )
        alb_sg.add_ingress_rule(
            ec2.Peer.any_ipv4(), ec2.Port.tcp(80), "Allow HTTP"
        )
        alb_sg.add_ingress_rule(
            ec2.Peer.any_ipv4(), ec2.Port.tcp(443), "Allow HTTPS"
        )
        alb_sg.add_ingress_rule(
            ec2.Peer.any_ipv4(), ec2.Port.tcp(8080), "Allow port 8080"
        )

        ecs_sg = ec2.SecurityGroup(
            self,
            "EcsSecurityGroup",
            vpc=vpc,
            description="Allow traffic from ALB to ECS containers",
            allow_all_outbound=True,
        )
        ecs_sg.add_ingress_rule(
            alb_sg, ec2.Port.tcp(80), "Allow port 80 from ALB"
        )

        rds_sg = ec2.SecurityGroup(
            self,
            "RdsSecurityGroup",
            vpc=vpc,
            description="Allow PostgreSQL access from ECS",
            allow_all_outbound=False,
        )
        rds_sg.add_ingress_rule(
            ecs_sg, ec2.Port.tcp(5432), "Allow PostgreSQL from ECS"
        )

        # ---------------------------------------------------------------
        # RDS PostgreSQL
        # ---------------------------------------------------------------
        db_instance = rds.DatabaseInstance(
            self,
            "LiteInfraDb",
            engine=rds.DatabaseInstanceEngine.postgres(
                version=rds.PostgresEngineVersion.VER_16,
            ),
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.T3, ec2.InstanceSize.MICRO
            ),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_ISOLATED
            ),
            security_groups=[rds_sg],
            database_name="appdb",
            publicly_accessible=False,
            removal_policy=RemovalPolicy.DESTROY,
            deletion_protection=False,
        )

        # ---------------------------------------------------------------
        # ECS Cluster
        # ---------------------------------------------------------------
        cluster = ecs.Cluster(
            self,
            "LiteInfraCluster",
            vpc=vpc,
        )

        # ---------------------------------------------------------------
        # ECS Task Definition (1 container, awsvpc networking)
        # ---------------------------------------------------------------
        task_definition = ecs.FargateTaskDefinition(
            self,
            "LiteInfraTaskDef",
            cpu=256,
            memory_limit_mib=512,
        )

        task_definition.add_container(
            "app",
            image=ecs.ContainerImage.from_registry("nginx:alpine"),
            memory_limit_mib=512,
            port_mappings=[
                ecs.PortMapping(container_port=80),
            ],
            logging=ecs.LogDrivers.aws_logs(stream_prefix="app"),
        )

        frontend_repo.grant_pull(task_definition.execution_role)
        backend_repo.grant_pull(task_definition.execution_role)

        # ---------------------------------------------------------------
        # VisionSense Task Definition (1 container, awsvpc networking)
        # ---------------------------------------------------------------
        visionsense_task_definition = ecs.FargateTaskDefinition(
            self,
            "VisionSenseTaskDef",
            cpu=256,
            memory_limit_mib=512,
        )

        visionsense_task_definition.add_container(
            "app",
            image=ecs.ContainerImage.from_registry("nginx:alpine"),
            memory_limit_mib=512,
            port_mappings=[
                ecs.PortMapping(container_port=80),
            ],
            logging=ecs.LogDrivers.aws_logs(stream_prefix="visionsense"),
        )

        visionsense_repo.grant_pull(visionsense_task_definition.execution_role)

        # ---------------------------------------------------------------
        # Application Load Balancer
        # ---------------------------------------------------------------
        alb = elbv2.ApplicationLoadBalancer(
            self,
            "LiteInfraAlb",
            vpc=vpc,
            internet_facing=True,
            security_group=alb_sg,
        )

        target_group = elbv2.ApplicationTargetGroup(
            self,
            "AppTargetGroup",
            vpc=vpc,
            port=80,
            protocol=elbv2.ApplicationProtocol.HTTP,
            target_type=elbv2.TargetType.IP,
            health_check=elbv2.HealthCheck(
                path="/",
                interval=Duration.seconds(30),
                healthy_threshold_count=2,
            ),
        )

        listener = alb.add_listener(
            "HttpListener",
            port=80,
            open=False,
            default_action=elbv2.ListenerAction.forward([target_group]),
        )

        visionsense_target_group = elbv2.ApplicationTargetGroup(
            self,
            "VisionSenseTargetGroup",
            vpc=vpc,
            port=80,
            protocol=elbv2.ApplicationProtocol.HTTP,
            target_type=elbv2.TargetType.IP,
            health_check=elbv2.HealthCheck(
                path="/health",
                port="80",
                interval=Duration.seconds(30),
                healthy_threshold_count=2,
                healthy_http_codes="200",
            ),
        )

        alb.add_listener(
            "Port8080Listener",
            port=8080,
            open=False,
            default_action=elbv2.ListenerAction.forward([visionsense_target_group]),
        )

        # ---------------------------------------------------------------
        # ECS Service
        # ---------------------------------------------------------------
        service = ecs.FargateService(
            self,
            "LiteInfraService",
            cluster=cluster,
            task_definition=task_definition,
            desired_count=1,
            min_healthy_percent=100,
            max_healthy_percent=200,
            security_groups=[ecs_sg],
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            assign_public_ip=True,
        )

        target_group.add_target(
            service.load_balancer_target(
                container_name="app",
                container_port=80,
            )
        )

        # ---------------------------------------------------------------
        # VisionSense ECS Service
        # ---------------------------------------------------------------
        visionsense_service = ecs.FargateService(
            self,
            "VisionSenseService",
            cluster=cluster,
            task_definition=visionsense_task_definition,
            desired_count=1,
            min_healthy_percent=100,
            max_healthy_percent=200,
            security_groups=[ecs_sg],
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            assign_public_ip=True,
        )

        visionsense_target_group.add_target(
            visionsense_service.load_balancer_target(
                container_name="app",
                container_port=80,
            )
        )

        # ---------------------------------------------------------------
        # Stack Outputs
        # ---------------------------------------------------------------
        CfnOutput(self, "VpcId", value=vpc.vpc_id)
        CfnOutput(self, "EcsClusterName", value=cluster.cluster_name)
        CfnOutput(self, "EcsServiceName", value=service.service_name)
        CfnOutput(self, "AlbDnsName", value=alb.load_balancer_dns_name)
        CfnOutput(self, "EcsSecurityGroupId", value=ecs_sg.security_group_id)
        CfnOutput(self, "RdsSecurityGroupId", value=rds_sg.security_group_id)
        CfnOutput(self, "RdsEndpoint", value=db_instance.db_instance_endpoint_address)
        CfnOutput(self, "FrontendEcrUri", value=frontend_repo.repository_uri)
        CfnOutput(self, "BackendEcrUri", value=backend_repo.repository_uri)
        CfnOutput(self, "VisionSenseEcrUri", value=visionsense_repo.repository_uri)
        CfnOutput(self, "HttpListenerArn", value=listener.listener_arn)
        CfnOutput(self, "AppTargetGroupArn", value=target_group.target_group_arn)
        CfnOutput(self, "VisionSenseEcsServiceName", value=visionsense_service.service_name)
