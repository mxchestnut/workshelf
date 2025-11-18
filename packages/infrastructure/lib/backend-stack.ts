import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class BackendStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda Authorizer for Keycloak JWT validation
    const authorizerFunction = new lambda.Function(this, 'KeycloakAuthorizer', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'authorizer/keycloak-authorizer.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Token Authorizer
    const authorizer = new apigateway.TokenAuthorizer(this, 'KeycloakTokenAuthorizer', {
      handler: authorizerFunction,
      identitySource: 'method.request.header.Authorization',
      resultsCacheTtl: cdk.Duration.minutes(5),
      authorizerName: 'KeycloakJWTAuthorizer',
    });

    // Lambda function for API
    const apiHandler = new lambda.Function(this, 'ApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        NODE_ENV: 'production',
        DATABASE_URL: process.env.DATABASE_URL || '',
        JWT_SECRET: process.env.JWT_SECRET || '',
        SENTRY_DSN: process.env.SENTRY_DSN || '',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // API Gateway with default authorizer
    const api = new apigateway.LambdaRestApi(this, 'WorkShelfApi', {
      handler: apiHandler,
      restApiName: 'WorkShelfAPI',
      description: 'API Gateway for WorkShelf Admin Platform',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: true,
      },
      cloudWatchRole: true,
      defaultMethodOptions: {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.CUSTOM,
      },
    });

    this.apiUrl = api.url;

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: api.restApiId,
      description: 'API Gateway ID',
    });
  }
}
