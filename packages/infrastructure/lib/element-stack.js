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
exports.ElementStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const s3deploy = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
class ElementStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const elementBucket = new s3.Bucket(this, 'WebBucket', {
            bucketName: `workshelf-element-${this.account}`,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });
        const certificate = acm.Certificate.fromCertificateArn(this, 'Certificate', 'arn:aws:acm:us-east-1:496675774501:certificate/c4ee2cc0-b283-4577-b8c2-cc9d4ac23327');
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
exports.ElementStack = ElementStack;
//# sourceMappingURL=element-stack.js.map