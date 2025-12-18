FROM node:20-alpine AS build

WORKDIR /app

# Accept build args with secure defaults
ARG VITE_API_URL=https://workshelf.dev
ARG VITE_AZURE_CLIENT_ID
ARG VITE_AZURE_TENANT
ARG VITE_SENTRY_DSN
ARG VITE_ENVIRONMENT=production
ARG VITE_RELEASE=unknown
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AZURE_CLIENT_ID=$VITE_AZURE_CLIENT_ID
ENV VITE_AZURE_TENANT=$VITE_AZURE_TENANT
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_ENVIRONMENT=$VITE_ENVIRONMENT
ENV VITE_RELEASE=$VITE_RELEASE

# Force cache bust for environment variable changes
ARG CACHE_BUST=1
RUN echo "=== BUILD INFO ===" && \
    echo "Cache bust: $CACHE_BUST" && \
    echo "VITE_API_URL: $VITE_API_URL" && \
    echo "VITE_AZURE_CLIENT_ID: $VITE_AZURE_CLIENT_ID" && \
    echo "VITE_AZURE_TENANT: $VITE_AZURE_TENANT" && \
    echo "VITE_ENVIRONMENT: $VITE_ENVIRONMENT" && \
    echo "VITE_RELEASE: $VITE_RELEASE" && \
    echo "=================="

# Install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Build app
COPY . .

# Remove any .env files to ensure only ENV vars are used
RUN rm -f .env* || true

RUN npm run build

# Production stage with ModSecurity
FROM owasp/modsecurity-crs:nginx-alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config as template (OWASP image uses template system)
COPY nginx.conf /etc/nginx/templates/conf.d/default.conf.template

# Copy ModSecurity custom rules to the CRS rules directory
COPY modsecurity.conf /etc/modsecurity.d/owasp-crs/rules/WORKSHELF-RULES.conf

# Enable ModSecurity
RUN sed -i 's/SecRuleEngine DetectionOnly/SecRuleEngine On/g' /etc/modsecurity.d/modsecurity.conf || \
    sed -i 's/SecRuleEngine DetectionOnly/SecRuleEngine On/g' /etc/nginx/modsecurity/modsecurity.conf || \
    true

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
