FROM node:22-alpine

WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application code
COPY src/ ./src/
COPY public/ ./public/
COPY bin/ ./bin/
COPY .mcp-config.json ./

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
