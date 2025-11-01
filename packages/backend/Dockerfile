FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY src/ ./src/

# Development command
CMD ["pnpm", "dev"]