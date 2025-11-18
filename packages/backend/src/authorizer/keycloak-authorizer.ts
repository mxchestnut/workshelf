import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const KEYCLOAK_URL = 'https://keycloak.workshelf.dev';
const REALM = 'workshelf';
const JWKS_URI = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/certs`;

// Cache JWKS client
const client = jwksClient({
  cache: true,
  cacheMaxAge: 3600000, // 1 hour
  jwksUri: JWKS_URI,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context?: Record<string, any>
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  };
}

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log('Authorizer invoked', { methodArn: event.methodArn });

  try {
    // Extract token from Authorization header
    const token = event.authorizationToken?.replace('Bearer ', '');

    if (!token) {
      console.log('No token provided');
      throw new Error('Unauthorized');
    }

    // Verify JWT
    const decoded = await new Promise<jwt.JwtPayload>((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          algorithms: ['RS256'],
          issuer: `${KEYCLOAK_URL}/realms/${REALM}`,
        },
        (err, decoded) => {
          if (err) {
            console.error('JWT verification failed:', err.message);
            reject(err);
          } else {
            resolve(decoded as jwt.JwtPayload);
          }
        }
      );
    });

    console.log('Token verified', {
      sub: decoded.sub,
      preferred_username: decoded.preferred_username,
    });

    // Generate allow policy with user context
    return generatePolicy(decoded.sub || 'unknown', 'Allow', event.methodArn, {
      userId: decoded.sub,
      username: decoded.preferred_username || decoded.sub,
      email: decoded.email || '',
      roles: JSON.stringify(decoded.realm_access?.roles || []),
    });
  } catch (error) {
    console.error('Authorization failed:', error);
    // Return deny policy
    throw new Error('Unauthorized');
  }
};
