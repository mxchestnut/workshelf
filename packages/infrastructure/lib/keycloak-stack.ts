import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface KeycloakStackProps extends cdk.StackProps {
  adminUser: string;
  adminPassword: string;
  dbPassword: string;
}

export class KeycloakStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: KeycloakStackProps) {
    super(scope, id, props);

    // Use default VPC
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      isDefault: true,
    });

    // Security Group for Keycloak
    const keycloakSecurityGroup = new ec2.SecurityGroup(this, 'KeycloakSecurityGroup', {
      vpc,
      description: 'Security group for Keycloak',
      allowAllOutbound: true,
    });

    // Security Group for RDS
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'KeycloakDBSecurityGroup', {
      vpc,
      description: 'Security group for Keycloak RDS',
      allowAllOutbound: false,
    });

    dbSecurityGroup.addIngressRule(
      keycloakSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Keycloak to access database'
    );

    // RDS PostgreSQL Database
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
      credentials: rds.Credentials.fromPassword(
        'keycloak',
        cdk.SecretValue.unsafePlainText(props.dbPassword)
      ),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      publiclyAccessible: false,
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Security Group for ALB
    const albSecurityGroup = new ec2.SecurityGroup(this, 'KeycloakALBSecurityGroup', {
      vpc,
      description: 'Security group for Keycloak ALB',
      allowAllOutbound: true,
    });

    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP from anywhere'
    );

    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS from anywhere'
    );

    // Allow ALB to reach Keycloak
    keycloakSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(8080),
      'Allow traffic from ALB'
    );

    // CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, 'KeycloakLogGroup', {
      logGroupName: '/ecs/workshelf-keycloak',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Store secrets in Secrets Manager
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

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'KeycloakCluster', {
      vpc,
      clusterName: 'workshelf-keycloak',
    });

    // Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'KeycloakTaskDef', {
      memoryLimitMiB: 2048,
      cpu: 1024,
    });

    // Grant read access to secrets
    keycloakSecrets.grantRead(taskDefinition.taskRole);

    // Container
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

    // ECS Service (start with 1 task)
    const service = new ecs.FargateService(this, 'KeycloakService', {
      cluster,
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      securityGroups: [keycloakSecurityGroup],
      healthCheckGracePeriod: cdk.Duration.seconds(120),
    });

    // Import existing certificate
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'Certificate',
      'arn:aws:acm:us-east-1:496675774501:certificate/c4ee2cc0-b283-4577-b8c2-cc9d4ac23327'
    );

    // Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'KeycloakALB', {
      vpc,
      internetFacing: true,
      loadBalancerName: 'workshelf-keycloak-alb',
      securityGroup: albSecurityGroup,
    });

    // Target Group
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

    // Register service with target group
    service.attachToApplicationTargetGroup(targetGroup);

    // HTTPS Listener
    alb.addListener('HttpsListener', {
      port: 443,
      certificates: [certificate],
      defaultTargetGroups: [targetGroup],
    });

    // HTTP Listener (redirect to HTTPS)
    alb.addListener('HttpListener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true,
      }),
    });

    // Outputs
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
