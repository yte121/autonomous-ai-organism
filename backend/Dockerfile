# Stage 1: Builder
# Use a Go image that has the necessary build tools.
FROM golang:1.22-bookworm AS builder

# Install bun for Node.js dependency management
RUN apt-get update && apt-get install -y curl unzip
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

WORKDIR /app

# Copy dependency definition files
COPY go.mod go.sum ./
COPY package.json bun.lock* ./

# Install dependencies
# Using --frozen-lockfile is best practice for CI/CD and Docker builds
RUN bun install --frozen-lockfile
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build the Encore application
# The output will be a single static binary.
RUN CGO_ENABLED=1 encore build -o /server .

# Stage 2: Final Image
# Use a minimal, non-root base image for security.
FROM gcr.io/distroless/static-debian11

# Copy the built server binary from the builder stage
COPY --from=builder /server /server

# Expose the port Encore will run on (default is 4000)
EXPOSE 4000

# Set the entrypoint to the server binary
ENTRYPOINT ["/server"]
