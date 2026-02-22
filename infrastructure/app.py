import aws_cdk as cdk
from infrastructure.tasktracker_stack import TasktrackerStack

app = cdk.App()

TasktrackerStack(
    app,
    "TasktrackerStack",
    env=cdk.Environment(region="us-east-1"),
)

app.synth()
