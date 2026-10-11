# Stage 1: Base image with dependencies
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Stage 2: Test stage - executes unit tests for Jenkins CI quality gate
FROM base AS test
ENV NODE_ENV=test
RUN npm test

# Stage 3: Production stage - lean image, non-root user
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=base /app/src ./src

EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1

USER node
CMD ["node", "src/server.js"]
