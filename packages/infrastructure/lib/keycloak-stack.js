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
exports.KeycloakStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
const elbv2 = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const rds = __importStar(require("aws-cdk-lib/aws-rds"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
class KeycloakStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
            isDefault: true,
        });
        const keycloakSecurityGroup = new ec2.SecurityGroup(this, 'KeycloakSecurityGroup', {
            vpc,
            description: 'Security group for Keycloak',
            allowAllOutbound: true,
        });
        const dbSecurityGroup = new ec2.SecurityGroup(this, 'KeycloakDBSecurityGroup', {
            vpc,
            description: 'Security group for Keycloak RDS',
            allowAllOutbound: false,
        });
        dbSecurityGroup.addIngressRule(keycloakSecurityGroup, ec2.Port.tcp(5432), 'Allow Keycloak to access database');
        const database = new rds.DatabaseInstance(this, 'KeycloakDB', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_16_6,
            }),
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
            securityGroups: [dbSecurityGroup],
            databaseName: 'keycloak',
            credentials: rds.Credentials.fromPassword('keycloak', cdk.SecretValue.unsafePlainText(props.dbPassword)),
            allocatedStorage: 20,
            maxAllocatedStorage: 100,
            publiclyAccessible: false,
            deletionProtection: false,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const albSecurityGroup = new ec2.SecurityGroup(this, 'KeycloakALBSecurityGroup', {
            vpc,
            description: 'Security group for Keycloak ALB',
            allowAllOutbound: true,
        });
        albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP from anywhere');
        albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS from anywhere');
        keycloakSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(8080), 'Allow traffic from ALB');
        const logGroup = new logs.LogGroup(this, 'KeycloakLogGroup', {
            logGroupName: '/ecs/workshelf-keycloak',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const keycloakSecrets = new secretsmanager.Secret(this, 'KeycloakSecrets', {
            secretName: 'workshelf/keycloak',
            description: 'Keycloak secrets',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    database_password: 'npg_D9Jiv7WeQChu',
                    admin_user: props.adminUser,
                    admin_password: props.adminPassword,
                }),
                generateStringKey: 'unused',
            },
        });
        const cluster = new ecs.Cluster(this, 'KeycloakCluster', {
            vpc,
            clusterName: 'workshelf-keycloak',
        });
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'KeycloakTaskDef', {
            memoryLimitMiB: 2048,
            cpu: 1024,
        });
        keycloakSecrets.grantRead(taskDefinition.taskRole);
        const container = taskDefinition.addContainer('keycloak', {
            image: ecs.ContainerImage.fromRegistry('quay.io/keycloak/keycloak:23.0'),
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'keycloak',
                logGroup,
            }),
            environment: {
                KC_DB: 'postgres',
                KC_DB_URL: `jdbc:postgresql://${database.dbInstanceEndpointAddress}:${database.dbInstanceEndpointPort}/keycloak`,
                KC_DB_USERNAME: 'keycloak',
                KC_HOSTNAME: 'keycloak.workshelf.dev',
                KC_HOSTNAME_STRICT: 'false',
                KC_HOSTNAME_STRICT_HTTPS: 'false',
                KC_PROXY: 'edge',
                KC_HTTP_ENABLED: 'true',
                KC_HEALTH_ENABLED: 'true',
            },
            secrets: {
                KC_DB_PASSWORD: ecs.Secret.fromSecretsManager(keycloakSecrets, 'database_password'),
                KEYCLOAK_ADMIN: ecs.Secret.fromSecretsManager(keycloakSecrets, 'admin_user'),
                KEYCLOAK_ADMIN_PASSWORD: ecs.Secret.fromSecretsManager(keycloakSecrets, 'admin_password'),
            },
            command: ['start-dev'],
        });
        container.addPortMappings({
            containerPort: 8080,
            protocol: ecs.Protocol.TCP,
        });
        const service = new ecs.FargateService(this, 'KeycloakService', {
            cluster,
            taskDefinition,
            desiredCount: 1,
            assignPublicIp: true,
            securityGroups: [keycloakSecurityGroup],
            healthCheckGracePeriod: cdk.Duration.seconds(120),
        });
        const certificate = acm.Certificate.fromCertificateArn(this, 'Certificate', 'arn:aws:acm:us-east-1:496675774501:certificate/c4ee2cc0-b283-4577-b8c2-cc9d4ac23327');
        const alb = new elbv2.ApplicationLoadBalancer(this, 'KeycloakALB', {
            vpc,
            internetFacing: true,
            loadBalancerName: 'workshelf-keycloak-alb',
            securityGroup: albSecurityGroup,
        });
        const targetGroup = new elbv2.ApplicationTargetGroup(this, 'KeycloakTargetGroup', {
            vpc,
            port: 8080,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            healthCheck: {
                path: '/health/ready',
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(5),
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 3,
            },
            deregistrationDelay: cdk.Duration.seconds(30),
        });
        service.attachToApplicationTargetGroup(targetGroup);
        alb.addListener('HttpsListener', {
            port: 443,
            certificates: [certificate],
            defaultTargetGroups: [targetGroup],
        });
        alb.addListener('HttpListener', {
            port: 80,
            defaultAction: elbv2.ListenerAction.redirect({
                protocol: 'HTTPS',
                port: '443',
                permanent: true,
            }),
        });
        new cdk.CfnOutput(this, 'KeycloakALBDNS', {
            value: alb.loadBalancerDnsName,
            description: 'Keycloak ALB DNS Name',
        });
        new cdk.CfnOutput(this, 'KeycloakURL', {
            value: `https://${alb.loadBalancerDnsName}`,
            description: 'Keycloak URL',
        });
    }
}
exports.KeycloakStack = KeycloakStack;
//# sourceMappingURL=keycloak-stack.js.map