# Stage 1: Build the React application
FROM node:lts-alpine AS builder

# Install bun
RUN npm install -g bun

WORKDIR /app

# Copy dependency definition files
COPY package.json bun.lockb ./

# Install dependencies
# Using --frozen-lockfile is best practice for CI/CD and Docker builds
RUN bun install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Define the build-time variable
ARG VITE_CLIENT_TARGET

# Build the application, passing in the environment variable
RUN VITE_CLIENT_TARGET=$VITE_CLIENT_TARGET bun run build

# Stage 2: Serve the static files with Nginx
FROM nginx:stable-alpine

# Copy the built static assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
