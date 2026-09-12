"""
AWS CDK Python Stack for GomiMakasete.
Alternative IaC definition deploying DynamoDB tables, S3 bucket, and Bedrock AgentCore role.
"""
from aws_cdk import (
    App, Stack, RemovalPolicy, Duration,
    aws_dynamodb as dynamodb,
    aws_s3 as s3,
    aws_iam as iam,
)
from constructs import Construct

class GomiMakaseteStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. S3 Uploads Bucket
        uploads_bucket = s3.Bucket(
            self, "GomiUploadsBucket",
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )

        # 2. DynamoDB Schedule Table
        schedules_table = dynamodb.Table(
            self, "GomiSchedulesTable",
            partition_key=dynamodb.Attribute(name="PK", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True,
            removal_policy=RemovalPolicy.RETAIN
        )

        # 3. DynamoDB Sessions Table
        sessions_table = dynamodb.Table(
            self, "GomiSessionsTable",
            partition_key=dynamodb.Attribute(name="SessionId", type=dynamodb.AttributeType.STRING),
            time_to_live_attribute="TTL",
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY
        )

        # 4. IAM Execution Role for Bedrock AgentCore
        agent_role = iam.Role(
            self, "BedrockAgentCoreExecutionRole",
            assumed_by=iam.CompositePrincipal(
                iam.ServicePrincipal("lambda.amazonaws.com"),
                iam.ServicePrincipal("bedrock.amazonaws.com")
            ),
            description="Least-privilege role for GomiMakasete AgentCore runtime"
        )

        agent_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "bedrock:InvokeModel",
                    "bedrock:InvokeModelWithResponseStream",
                    "bedrock-agent-runtime:Retrieve"
                ],
                resources=["*"]
            )
        )

        schedules_table.grant_read_write_data(agent_role)
        sessions_table.grant_read_write_data(agent_role)
        uploads_bucket.grant_read_write(agent_role)

app = App()
GomiMakaseteStack(app, "GomiMakaseteStack")
app.synth()
