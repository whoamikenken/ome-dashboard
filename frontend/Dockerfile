# Stage 1: Build the frontend application
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy codebase and build
COPY . .
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Copy build artifacts to nginx public folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create the environment injection entrypoint script
RUN mkdir -p /docker-entrypoint.d && \
    echo '#!/bin/sh' > /docker-entrypoint.d/40-inject-env.sh && \
    echo 'envsubst < /usr/share/nginx/html/assets/env.template.js > /usr/share/nginx/html/assets/env.js' >> /docker-entrypoint.d/40-inject-env.sh && \
    chmod +x /docker-entrypoint.d/40-inject-env.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
