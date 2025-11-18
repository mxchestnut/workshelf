"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackendStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
class BackendStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const authorizerFunction = new lambda.Function(this, 'KeycloakAuthorizer', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'authorizer/keycloak-authorizer.handler',
            code: lambda.Code.fromAsset('../backend/dist'),
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            logRetention: logs.RetentionDays.ONE_WEEK,
        });
        const authorizer = new apigateway.TokenAuthorizer(this, 'KeycloakTokenAuthorizer', {
            handler: authorizerFunction,
            identitySource: 'method.request.header.Authorization',
            resultsCacheTtl: cdk.Duration.minutes(5),
            authorizerName: 'KeycloakJWTAuthorizer',
        });
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
exports.BackendStack = BackendStack;
//# sourceMappingURL=backend-stack.js.map