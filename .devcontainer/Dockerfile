# Stage 1: Build
FROM mcr.microsoft.com/devcontainers/typescript-node:1-18-bullseye AS build

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Copy source code and build
COPY . .
RUN pnpm run build

# Stage 2: Production
FROM mcr.microsoft.com/devcontainers/typescript-node:1-18-bullseye

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy built files from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

# Set the default command
CMD ["node", "dist/index.js"]
