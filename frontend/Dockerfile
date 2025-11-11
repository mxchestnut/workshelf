FROM node:20-alpine as build

WORKDIR /app

# Accept build args for API and Keycloak URLs with secure defaults
ARG VITE_API_URL=https://api.workshelf.dev
ARG VITE_KEYCLOAK_URL=https://workshelf-keycloak.wonderfulstone-7c41e05e.centralus.azurecontainerapps.io
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build app
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
