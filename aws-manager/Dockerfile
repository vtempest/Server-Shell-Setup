# Use the official Bun image
FROM oven/bun:1-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    bash

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Create AWS credentials directory
RUN mkdir -p /root/.aws

# Set proper permissions
RUN chmod +x reboot-ec2.js

# Default command
CMD ["bun", "run", "reboot"]
