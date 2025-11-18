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
exports.AdminToolsStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
const elbv2 = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
class AdminToolsStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const vpc = ec2.Vpc.fromLookup(this, 'VPC', { isDefault: true });
        const cluster = new ecs.Cluster(this, 'AdminToolsCluster', {
            vpc,
            clusterName: 'workshelf-admin-tools',
        });
        const certificate = acm.Certificate.fromCertificateArn(this, 'Certificate', 'arn:aws:acm:us-east-1:496675774501:certificate/c4ee2cc0-b283-4577-b8c2-cc9d4ac23327');
        const alb = new elbv2.ApplicationLoadBalancer(this, 'AdminToolsALB', {
            vpc,
            internetFacing: true,
            loadBalancerName: 'workshelf-admin-tools',
        });
        alb.addListener('HttpsListener', {
            port: 443,
            certificates: [certificate],
            defaultAction: elbv2.ListenerAction.fixedResponse(200, {
                contentType: 'text/plain',
                messageBody: 'Admin Tools',
            }),
        });
        this.albDnsName = alb.loadBalancerDnsName;
        this.createVaultService(cluster, vpc, alb);
        this.createGrafanaService(cluster, vpc, alb);
        this.createPrometheusService(cluster, vpc, alb);
        this.createPostHogService(cluster, vpc, alb);
        this.createUnleashService(cluster, vpc, alb);
        new cdk.CfnOutput(this, 'AdminToolsALBDNS', {
            value: alb.loadBalancerDnsName,
            description: 'Admin Tools ALB DNS',
        });
    }
    createVaultService(cluster, vpc, alb) {
        const taskDef = new ecs.FargateTaskDefinition(this, 'VaultTask', {
            memoryLimitMiB: 512,
            cpu: 256,
        });
        const secrets = new secretsmanager.Secret(this, 'VaultSecrets', {
            secretName: 'workshelf/vault',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ root_token: 'myroot' }),
                generateStringKey: 'unused',
            },
        });
        secrets.grantRead(taskDef.taskRole);
        const container = taskDef.addContainer('vault', {
            image: ecs.ContainerImage.fromRegistry('hashicorp/vault:1.15'),
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'vault',
                logGroup: new logs.LogGroup(this, 'VaultLogs', {
                    logGroupName: '/ecs/workshelf-vault',
                    retention: logs.RetentionDays.ONE_WEEK,
                    removalPolicy: cdk.RemovalPolicy.DESTROY,
                }),
            }),
            environment: {
                VAULT_DEV_LISTEN_ADDRESS: '0.0.0.0:8200',
            },
            secrets: {
                VAULT_DEV_ROOT_TOKEN_ID: ecs.Secret.fromSecretsManager(secrets, 'root_token'),
            },
            portMappings: [{ containerPort: 8200 }],
        });
        const service = new ecs.FargateService(this, 'VaultService', {
            cluster,
            taskDefinition: taskDef,
            desiredCount: 1,
            assignPublicIp: true,
        });
        const tg = new elbv2.ApplicationTargetGroup(this, 'VaultTG', {
            vpc,
            port: 8200,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            healthCheck: { path: '/v1/sys/health', interval: cdk.Duration.seconds(30) },
        });
        service.attachToApplicationTargetGroup(tg);
        alb.listeners[0].addTargetGroups('VaultTGAttach', {
            targetGroups: [tg],
            priority: 10,
            conditions: [elbv2.ListenerCondition.pathPatterns(['/vault*'])],
        });
    }
    createGrafanaService(cluster, vpc, alb) {
        const taskDef = new ecs.FargateTaskDefinition(this, 'GrafanaTask', {
            memoryLimitMiB: 512,
            cpu: 256,
        });
        const container = taskDef.addContainer('grafana', {
            image: ecs.ContainerImage.fromRegistry('grafana/grafana:latest'),
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'grafana',
                logGroup: new logs.LogGroup(this, 'GrafanaLogs', {
                    logGroupName: '/ecs/workshelf-grafana',
                    retention: logs.RetentionDays.ONE_WEEK,
                    removalPolicy: cdk.RemovalPolicy.DESTROY,
                }),
            }),
            environment: {
                GF_SECURITY_ADMIN_PASSWORD: 'admin',
                GF_SERVER_ROOT_URL: 'https://admin.workshelf.dev/grafana',
                GF_SERVER_SERVE_FROM_SUB_PATH: 'true',
            },
            portMappings: [{ containerPort: 3000 }],
        });
        const service = new ecs.FargateService(this, 'GrafanaService', {
            cluster,
            taskDefinition: taskDef,
            desiredCount: 1,
            assignPublicIp: true,
        });
        const tg = new elbv2.ApplicationTargetGroup(this, 'GrafanaTG', {
            vpc,
            port: 3000,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            healthCheck: { path: '/api/health', interval: cdk.Duration.seconds(30) },
        });
        service.attachToApplicationTargetGroup(tg);
        alb.listeners[0].addTargetGroups('GrafanaTGAttach', {
            targetGroups: [tg],
            priority: 20,
            conditions: [elbv2.ListenerCondition.pathPatterns(['/grafana*'])],
        });
    }
    createPrometheusService(cluster, vpc, alb) {
        const taskDef = new ecs.FargateTaskDefinition(this, 'PrometheusTask', {
            memoryLimitMiB: 512,
            cpu: 256,
        });
        const container = taskDef.addContainer('prometheus', {
            image: ecs.ContainerImage.fromRegistry('prom/prometheus:latest'),
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'prometheus',
                logGroup: new logs.LogGroup(this, 'PrometheusLogs', {
                    logGroupName: '/ecs/workshelf-prometheus',
                    retention: logs.RetentionDays.ONE_WEEK,
                    removalPolicy: cdk.RemovalPolicy.DESTROY,
                }),
            }),
            portMappings: [{ containerPort: 9090 }],
        });
        const service = new ecs.FargateService(this, 'PrometheusService', {
            cluster,
            taskDefinition: taskDef,
            desiredCount: 1,
            assignPublicIp: true,
        });
        const tg = new elbv2.ApplicationTargetGroup(this, 'PrometheusTG', {
            vpc,
            port: 9090,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            healthCheck: { path: '/-/healthy', interval: cdk.Duration.seconds(30) },
        });
        service.attachToApplicationTargetGroup(tg);
        alb.listeners[0].addTargetGroups('PrometheusTGAttach', {
            targetGroups: [tg],
            priority: 30,
            conditions: [elbv2.ListenerCondition.pathPatterns(['/prometheus*'])],
        });
    }
    createPostHogService(cluster, vpc, alb) {
        const taskDef = new ecs.FargateTaskDefinition(this, 'PostHogTask', {
            memoryLimitMiB: 1024,
            cpu: 512,
        });
        const container = taskDef.addContainer('posthog', {
            image: ecs.ContainerImage.fromRegistry('posthog/posthog:latest'),
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'posthog',
                logGroup: new logs.LogGroup(this, 'PostHogLogs', {
                    logGroupName: '/ecs/workshelf-posthog',
                    retention: logs.RetentionDays.ONE_WEEK,
                    removalPolicy: cdk.RemovalPolicy.DESTROY,
                }),
            }),
            portMappings: [{ containerPort: 8000 }],
        });
        const service = new ecs.FargateService(this, 'PostHogService', {
            cluster,
            taskDefinition: taskDef,
            desiredCount: 1,
            assignPublicIp: true,
        });
        const tg = new elbv2.ApplicationTargetGroup(this, 'PostHogTG', {
            vpc,
            port: 8000,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            healthCheck: { path: '/_health', interval: cdk.Duration.seconds(30) },
        });
        service.attachToApplicationTargetGroup(tg);
        alb.listeners[0].addTargetGroups('PostHogTGAttach', {
            targetGroups: [tg],
            priority: 40,
            conditions: [elbv2.ListenerCondition.pathPatterns(['/posthog*'])],
        });
    }
    createUnleashService(cluster, vpc, alb) {
        const taskDef = new ecs.FargateTaskDefinition(this, 'UnleashTask', {
            memoryLimitMiB: 512,
            cpu: 256,
        });
        const container = taskDef.addContainer('unleash', {
            image: ecs.ContainerImage.fromRegistry('unleashorg/unleash-server:latest'),
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'unleash',
                logGroup: new logs.LogGroup(this, 'UnleashLogs', {
                    logGroupName: '/ecs/workshelf-unleash',
                    retention: logs.RetentionDays.ONE_WEEK,
                    removalPolicy: cdk.RemovalPolicy.DESTROY,
                }),
            }),
            environment: {
                DATABASE_URL: process.env.DATABASE_URL || '',
                DATABASE_SSL: 'false',
            },
            portMappings: [{ containerPort: 4242 }],
        });
        const service = new ecs.FargateService(this, 'UnleashService', {
            cluster,
            taskDefinition: taskDef,
            desiredCount: 1,
            assignPublicIp: true,
        });
        const tg = new elbv2.ApplicationTargetGroup(this, 'UnleashTG', {
            vpc,
            port: 4242,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            healthCheck: { path: '/health', interval: cdk.Duration.seconds(30) },
        });
        service.attachToApplicationTargetGroup(tg);
        alb.listeners[0].addTargetGroups('UnleashTGAttach', {
            targetGroups: [tg],
            priority: 50,
            conditions: [elbv2.ListenerCondition.pathPatterns(['/unleash*'])],
        });
    }
}
exports.AdminToolsStack = AdminToolsStack;
//# sourceMappingURL=admin-tools-stack.js.map