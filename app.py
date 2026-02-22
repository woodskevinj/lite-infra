import aws_cdk as cdk
from infrastructure.liteinfra_stack import LiteInfraStack

app = cdk.App()

LiteInfraStack(
    app,
    "LiteInfraStack",
    env=cdk.Environment(region="us-east-1"),
)

app.synth()
