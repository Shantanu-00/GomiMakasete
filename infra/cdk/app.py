"""
AWS CDK Python Stack for GomiMakasete.
Production IaC definition deploying DynamoDB tables, S3 bucket, Bedrock AgentCore role,
Lambda MicroVM runtime (ARM64), and REST API Gateway for live Bedrock invocations.
"""
import os
from pathlib import Path
from aws_cdk import (
    App, Stack, RemovalPolicy, Duration, CfnOutput,
    aws_dynamodb as dynamodb,
    aws_s3 as s3,
    aws_iam as iam,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
)
from constructs import Construct

class GomiMakaseteStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. S3 Uploads Bucket (Encrypted, Private, Auto-delete on destroy)
        uploads_bucket = s3.Bucket(
            self, "GomiUploadsBucket",
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )

        # 2. DynamoDB Schedule Table ($0.00 idle cost, on-demand capacity)
        schedules_table = dynamodb.Table(
            self, "GomiSchedulesTable",
            partition_key=dynamodb.Attribute(name="PK", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True,
            removal_policy=RemovalPolicy.RETAIN
        )

        # 3. DynamoDB Sessions Table (TTL-enabled conversation history)
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

        # 5. AgentCore Runtime Lambda Function (ARM64 MicroVM, Python 3.11)
        src_path = str(Path(__file__).resolve().parent.parent.parent / "src")

        agentcore_fn = _lambda.Function(
            self, "AgentCoreRuntimeFunction",
            runtime=_lambda.Runtime.PYTHON_3_11,
            architecture=_lambda.Architecture.ARM_64,
            handler="backend.app.handler",
            code=_lambda.Code.from_asset(src_path),
            role=agent_role,
            timeout=Duration.seconds(60),
            memory_size=1024,
            environment={
                "ENV": "prod",
                "BEDROCK_TIER1_MODEL_ID": "us.amazon.nova-lite-v1:0",
                "BEDROCK_TIER2_MODEL_ID": "us.amazon.nova-pro-v1:0",
                "DAILY_BEDROCK_BUDGET_USD": "5.00",
                "DYNAMODB_SCHEDULE_TABLE": schedules_table.table_name,
                "DYNAMODB_SESSION_TABLE": sessions_table.table_name,
                "S3_INGESTION_BUCKET": uploads_bucket.bucket_name,
                "POWERTOOLS_SERVICE_NAME": "gomimakasete-agentcore",
                "PYTHONPATH": "/var/task",
            }
        )

        # 6. API Gateway: Exposes /ping, /invocations, /budget
        api = apigw.LambdaRestApi(
            self, "GomiAgentCoreApi",
            handler=agentcore_fn,
            proxy=True,
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=[
                    "Content-Type",
                    "X-Amz-Date",
                    "Authorization",
                    "X-Api-Key",
                    "X-Amz-Security-Token",
                    "X-AgentCore-Secret"
                ]
            )
        )

        # 7. Stack Outputs for Frontend & AgentCore Integration
        CfnOutput(self, "AgentCoreEndpoint", value=f"{api.url}invocations")
        CfnOutput(self, "PingEndpoint", value=f"{api.url}ping")
        CfnOutput(self, "BudgetEndpoint", value=f"{api.url}budget")
        CfnOutput(self, "SchedulesTableName", value=schedules_table.table_name)
        CfnOutput(self, "SessionsTableName", value=sessions_table.table_name)
        CfnOutput(self, "UploadsBucketName", value=uploads_bucket.bucket_name)

app = App()
GomiMakaseteStack(app, "GomiMakaseteStack")
app.synth()
