import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export class ElementStack extends cdk.Stack {
  public readonly distributionDomainName: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for Element Web
    const elementBucket = new s3.Bucket(this, 'WebBucket', {
      bucketName: `workshelf-element-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Import existing certificate
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'Certificate',
      'arn:aws:acm:us-east-1:496675774501:certificate/c4ee2cc0-b283-4577-b8c2-cc9d4ac23327'
    );

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'ElementDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(elementBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        compress: true,
      },
      domainNames: ['element.workshelf.dev'],
      certificate,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    this.distributionDomainName = distribution.distributionDomainName;

    // Download and deploy Element Web
    new s3deploy.BucketDeployment(this, 'DeployElement', {
      sources: [
        s3deploy.Source.asset('/tmp/element-v1.11.81'),
        s3deploy.Source.jsonData('config.json', {
          default_server_config: {
            'm.homeserver': {
              base_url: 'https://chat.workshelf.dev',
              server_name: 'chat.workshelf.dev',
            },
          },
          brand: 'WorkShelf Chat',
          disable_guests: true,
          disable_3pid_login: true,
          default_theme: 'dark',
          features: {
            feature_pinning: true,
            feature_custom_status: true,
            feature_custom_tags: true,
          },
          setting_defaults: {
            custom_themes: [],
          },
        }),
      ],
      destinationBucket: elementBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Outputs
    new cdk.CfnOutput(this, 'ElementURL', {
      value: `https://element.workshelf.dev`,
      description: 'Element Web URL',
    });

    new cdk.CfnOutput(this, 'ElementDistributionDomain', {
      value: this.distributionDomainName,
      description: 'CloudFront Distribution Domain',
    });

    new cdk.CfnOutput(this, 'ElementBucket', {
      value: elementBucket.bucketName,
      description: 'S3 Bucket for Element Web',
    });
  }
}
