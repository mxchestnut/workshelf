FROM node:20-alpine as build

WORKDIR /app

# Accept build args for API and Keycloak URLs with secure defaults
ARG VITE_API_URL=https://api.workshelf.dev
ARG VITE_KEYCLOAK_URL=https://keycloak.workshelf.dev
ARG VITE_SENTRY_DSN
ARG VITE_ENVIRONMENT=production
ARG VITE_RELEASE=unknown
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_ENVIRONMENT=$VITE_ENVIRONMENT
ENV VITE_RELEASE=$VITE_RELEASE

# Force cache bust for environment variable changes
ARG CACHE_BUST=1
RUN echo "=== BUILD INFO ===" && \
    echo "Cache bust: $CACHE_BUST" && \
    echo "VITE_API_URL: $VITE_API_URL" && \
    echo "VITE_KEYCLOAK_URL: $VITE_KEYCLOAK_URL" && \
    echo "VITE_ENVIRONMENT: $VITE_ENVIRONMENT" && \
    echo "VITE_RELEASE: $VITE_RELEASE" && \
    echo "=================="

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build app
COPY . .

# Remove any .env files to ensure only ENV vars are used
RUN rm -f .env* || true

RUN npm run build

# Production stage with ModSecurity
FROM owasp/modsecurity-crs:nginx-alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy ModSecurity custom rules
COPY modsecurity.conf /etc/nginx/modsecurity/workshelf-rules.conf

# Include custom rules in ModSecurity config
RUN echo "Include /etc/nginx/modsecurity/workshelf-rules.conf" >> /etc/nginx/modsecurity/modsecurity.conf

# Enable ModSecurity
RUN sed -i 's/SecRuleEngine DetectionOnly/SecRuleEngine On/' /etc/nginx/modsecurity/modsecurity.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
