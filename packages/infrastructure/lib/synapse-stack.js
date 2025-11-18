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
exports.SynapseStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
const efs = __importStar(require("aws-cdk-lib/aws-efs"));
const elbv2 = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
class SynapseStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {
            isDefault: true,
        });
        const cluster = new ecs.Cluster(this, 'SynapseCluster', {
            vpc,
            clusterName: 'workshelf-synapse',
        });
        const synapseSecurityGroup = new ec2.SecurityGroup(this, 'SynapseSecurityGroup', {
            vpc,
            description: 'Security group for Synapse Matrix server',
            allowAllOutbound: true,
        });
        const fileSystem = new efs.FileSystem(this, 'SynapseEFS', {
            vpc,
            encrypted: true,
            performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
            throughputMode: efs.ThroughputMode.BURSTING,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            fileSystemName: 'workshelf-synapse-data',
        });
        const accessPoint = new efs.AccessPoint(this, 'SynapseAccessPoint', {
            fileSystem,
            path: '/synapse',
            posixUser: {
                uid: '991',
                gid: '991',
            },
            createAcl: {
                ownerUid: '991',
                ownerGid: '991',
                permissions: '755',
            },
        });
        fileSystem.connections.allowDefaultPortFrom(synapseSecurityGroup);
        const synapseSecrets = new secretsmanager.Secret(this, 'SynapseSecrets', {
            secretName: 'workshelf/synapse',
            description: 'Synapse Matrix server secrets',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    database_url: props.databaseUrl,
                    keycloak_client_secret: props.keycloakClientSecret,
                }),
                generateStringKey: 'registration_shared_secret',
                passwordLength: 32,
            },
        });
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'SynapseTaskDef', {
            memoryLimitMiB: 2048,
            cpu: 1024,
        });
        fileSystem.grant(taskDefinition.taskRole, 'elasticfilesystem:ClientMount', 'elasticfilesystem:ClientWrite');
        taskDefinition.addVolume({
            name: 'synapse-data',
            efsVolumeConfiguration: {
                fileSystemId: fileSystem.fileSystemId,
                transitEncryption: 'ENABLED',
                authorizationConfig: {
                    accessPointId: accessPoint.accessPointId,
                    iam: 'ENABLED',
                },
            },
        });
        synapseSecrets.grantRead(taskDefinition.taskRole);
        const logGroup = new logs.LogGroup(this, 'SynapseLogGroup', {
            logGroupName: '/ecs/workshelf-synapse',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const container = taskDefinition.addContainer('synapse', {
            image: ecs.ContainerImage.fromRegistry('matrixdotorg/synapse:latest'),
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'synapse',
                logGroup,
            }),
            environment: {
                SYNAPSE_SERVER_NAME: 'chat.workshelf.dev',
                SYNAPSE_REPORT_STATS: 'no',
                SYNAPSE_NO_TLS: 'true',
            },
            secrets: {
                DATABASE_URL: ecs.Secret.fromSecretsManager(synapseSecrets, 'database_url'),
                KEYCLOAK_CLIENT_SECRET: ecs.Secret.fromSecretsManager(synapseSecrets, 'keycloak_client_secret'),
            },
        });
        container.addMountPoints({
            containerPath: '/data',
            sourceVolume: 'synapse-data',
            readOnly: false,
        });
        container.addPortMappings({
            containerPort: 8008,
            protocol: ecs.Protocol.TCP,
        });
        const service = new ecs.FargateService(this, 'SynapseService', {
            cluster,
            taskDefinition,
            desiredCount: 0,
            assignPublicIp: true,
            securityGroups: [synapseSecurityGroup],
        });
        const alb = new elbv2.ApplicationLoadBalancer(this, 'SynapseALB', {
            vpc,
            internetFacing: true,
            loadBalancerName: 'workshelf-synapse-alb',
        });
        const targetGroup = new elbv2.ApplicationTargetGroup(this, 'SynapseTargetGroup', {
            vpc,
            port: 8008,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            healthCheck: {
                path: '/_matrix/client/versions',
                interval: cdk.Duration.seconds(60),
                timeout: cdk.Duration.seconds(30),
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 3,
            },
            deregistrationDelay: cdk.Duration.seconds(30),
        });
        service.attachToApplicationTargetGroup(targetGroup);
        alb.addListener('HttpListener', {
            port: 80,
            defaultTargetGroups: [targetGroup],
        });
        synapseSecurityGroup.addIngressRule(ec2.Peer.securityGroupId(alb.connections.securityGroups[0].securityGroupId), ec2.Port.tcp(8008), 'Allow traffic from ALB');
        this.loadBalancerDns = alb.loadBalancerDnsName;
        new cdk.CfnOutput(this, 'LoadBalancerDNS', {
            value: alb.loadBalancerDnsName,
            description: 'Synapse Load Balancer DNS',
        });
        new cdk.CfnOutput(this, 'ClusterName', {
            value: cluster.clusterName,
            description: 'ECS Cluster Name',
        });
        new cdk.CfnOutput(this, 'ServiceName', {
            value: service.serviceName,
            description: 'ECS Service Name',
        });
    }
}
exports.SynapseStack = SynapseStack;
//# sourceMappingURL=synapse-stack.js.map