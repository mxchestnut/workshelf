import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class AdminToolsStack extends cdk.Stack {
  public readonly albDnsName: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'VPC', { isDefault: true });

    const cluster = new ecs.Cluster(this, 'AdminToolsCluster', {
      vpc,
      clusterName: 'workshelf-admin-tools',
    });

    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'Certificate',
      'arn:aws:acm:us-east-1:496675774501:certificate/c4ee2cc0-b283-4577-b8c2-cc9d4ac23327'
    );

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

    // Vault
    this.createVaultService(cluster, vpc, alb);
    // Grafana
    this.createGrafanaService(cluster, vpc, alb);
    // Prometheus
    this.createPrometheusService(cluster, vpc, alb);
    // PostHog
    this.createPostHogService(cluster, vpc, alb);
    // Unleash
    this.createUnleashService(cluster, vpc, alb);
    // Sentry
    this.createSentryService(cluster, vpc, alb);
    // OpenSearch
    this.createOpenSearchService(cluster, vpc, alb);
    // Matomo
    this.createMatomoService(cluster, vpc, alb);

    new cdk.CfnOutput(this, 'AdminToolsALBDNS', {
      value: alb.loadBalancerDnsName,
      description: 'Admin Tools ALB DNS',
    });
  }

  private createVaultService(
    cluster: ecs.Cluster,
    vpc: ec2.IVpc,
    alb: elbv2.ApplicationLoadBalancer
  ) {
    const taskDef = new ecs.FargateTaskDefinition(this, 'VaultTask', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    const secrets = new secretsmanager.Secret(this, 'VaultSecrets', {
      secretName: 'workshelf/vault',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          root_token: process.env.VAULT_TOKEN || 'dev-token-change-immediately',
        }),
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

  private createGrafanaService(
    cluster: ecs.Cluster,
    vpc: ec2.IVpc,
    alb: elbv2.ApplicationLoadBalancer
  ) {
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
        GF_SECURITY_ADMIN_PASSWORD: process.env.GRAFANA_ADMIN_PASSWORD || 'changeme',
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

  private createPrometheusService(
    cluster: ecs.Cluster,
    vpc: ec2.IVpc,
    alb: elbv2.ApplicationLoadBalancer
  ) {
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

  private createPostHogService(
    cluster: ecs.Cluster,
    vpc: ec2.IVpc,
    alb: elbv2.ApplicationLoadBalancer
  ) {
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

  private createUnleashService(
    cluster: ecs.Cluster,
    vpc: ec2.IVpc,
    alb: elbv2.ApplicationLoadBalancer
  ) {
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

  private createSentryService(
    cluster: ecs.Cluster,
    vpc: ec2.IVpc,
    alb: elbv2.ApplicationLoadBalancer
  ) {
    const taskDef = new ecs.FargateTaskDefinition(this, 'SentryTask', {
      memoryLimitMiB: 2048,
      cpu: 1024,
    });

    // Sentry requires Redis and Postgres
    const container = taskDef.addContainer('sentry', {
      image: ecs.ContainerImage.fromRegistry('getsentry/sentry:latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'sentry',
        logGroup: new logs.LogGroup(this, 'SentryLogs', {
          logGroupName: '/ecs/workshelf-sentry',
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      }),
      environment: {
        SENTRY_SECRET_KEY: process.env.SENTRY_SECRET_KEY || 'dev-secret-key-change-in-prod',
        SENTRY_POSTGRES_HOST: process.env.DATABASE_HOST || '',
        SENTRY_DB_NAME: 'sentry',
        SENTRY_DB_USER: process.env.DATABASE_USER || '',
        SENTRY_REDIS_HOST: 'localhost',
        SENTRY_REDIS_PORT: '6379',
      },
      portMappings: [{ containerPort: 9000 }],
    });

    const service = new ecs.FargateService(this, 'SentryService', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      assignPublicIp: true,
    });

    const tg = new elbv2.ApplicationTargetGroup(this, 'SentryTG', {
      vpc,
      port: 9000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: { path: '/_health/', interval: cdk.Duration.seconds(30) },
    });

    service.attachToApplicationTargetGroup(tg);

    alb.listeners[0].addTargetGroups('SentryTGAttach', {
      targetGroups: [tg],
      priority: 60,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/sentry*'])],
    });
  }

  private createOpenSearchService(
    cluster: ecs.Cluster,
    vpc: ec2.IVpc,
    alb: elbv2.ApplicationLoadBalancer
  ) {
    const taskDef = new ecs.FargateTaskDefinition(this, 'OpenSearchTask', {
      memoryLimitMiB: 2048,
      cpu: 1024,
    });

    const container = taskDef.addContainer('opensearch', {
      image: ecs.ContainerImage.fromRegistry('opensearchproject/opensearch:latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'opensearch',
        logGroup: new logs.LogGroup(this, 'OpenSearchLogs', {
          logGroupName: '/ecs/workshelf-opensearch',
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      }),
      environment: {
        'discovery.type': 'single-node',
        OPENSEARCH_JAVA_OPTS: '-Xms512m -Xmx512m',
        DISABLE_SECURITY_PLUGIN: 'true', // Enable security in production
      },
      portMappings: [{ containerPort: 9200 }],
    });

    const service = new ecs.FargateService(this, 'OpenSearchService', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      assignPublicIp: true,
    });

    const tg = new elbv2.ApplicationTargetGroup(this, 'OpenSearchTG', {
      vpc,
      port: 9200,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: { path: '/_cluster/health', interval: cdk.Duration.seconds(30) },
    });

    service.attachToApplicationTargetGroup(tg);

    alb.listeners[0].addTargetGroups('OpenSearchTGAttach', {
      targetGroups: [tg],
      priority: 70,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/opensearch*'])],
    });
  }

  private createMatomoService(
    cluster: ecs.Cluster,
    vpc: ec2.IVpc,
    alb: elbv2.ApplicationLoadBalancer
  ) {
    const taskDef = new ecs.FargateTaskDefinition(this, 'MatomoTask', {
      memoryLimitMiB: 1024,
      cpu: 512,
    });

    const container = taskDef.addContainer('matomo', {
      image: ecs.ContainerImage.fromRegistry('matomo:latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'matomo',
        logGroup: new logs.LogGroup(this, 'MatomoLogs', {
          logGroupName: '/ecs/workshelf-matomo',
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      }),
      environment: {
        MATOMO_DATABASE_HOST: process.env.DATABASE_HOST || '',
        MATOMO_DATABASE_ADAPTER: 'pdo_pgsql',
        MATOMO_DATABASE_TABLES_PREFIX: 'matomo_',
        MATOMO_DATABASE_USERNAME: process.env.DATABASE_USER || '',
        MATOMO_DATABASE_PASSWORD: process.env.DATABASE_PASSWORD || '',
        MATOMO_DATABASE_DBNAME: 'matomo',
      },
      portMappings: [{ containerPort: 80 }],
    });

    const service = new ecs.FargateService(this, 'MatomoService', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      assignPublicIp: true,
    });

    const tg = new elbv2.ApplicationTargetGroup(this, 'MatomoTG', {
      vpc,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: { path: '/matomo.php', interval: cdk.Duration.seconds(30) },
    });

    service.attachToApplicationTargetGroup(tg);

    alb.listeners[0].addTargetGroups('MatomoTGAttach', {
      targetGroups: [tg],
      priority: 80,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/matomo*'])],
    });
  }
}
