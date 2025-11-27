FROM node:20-alpine as build

WORKDIR /app

# Accept build args for API and Keycloak URLs with secure defaults
ARG VITE_API_URL=https://api.workshelf.dev
ARG VITE_KEYCLOAK_URL=https://workshelf-keycloak.wonderfulstone-7c41e05e.centralus.azurecontainerapps.io
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL

# Force cache bust for environment variable changes
ARG CACHE_BUST=1
RUN echo "=== BUILD INFO ===" && \
    echo "Cache bust: $CACHE_BUST" && \
    echo "VITE_API_URL: $VITE_API_URL" && \
    echo "VITE_KEYCLOAK_URL: $VITE_KEYCLOAK_URL" && \
    echo "=================="

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build app
COPY . .

# Remove any .env files to ensure only ENV vars are used
RUN rm -f .env* || true

RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
