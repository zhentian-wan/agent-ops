# Build from repository root (uses the workspace lockfile):
#   docker build -f aurora-app/Dockerfile -t aurora-app .
# Run:
#   docker run --rm -p 8080:80 aurora-app

FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@11.5.1 --activate

WORKDIR /app

# Monorepo build (context = repo root)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY aurora-app/package.json ./aurora-app/

RUN pnpm install --frozen-lockfile --filter @agentic-deployment/aurora-app

COPY aurora-app ./aurora-app

RUN pnpm --filter @agentic-deployment/aurora-app build

FROM nginx:1.27-alpine AS production

COPY --from=build /app/aurora-app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
