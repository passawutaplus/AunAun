# So1o Freelancer — production SSR container (Node, not Cloudflare Workers)

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .

# VITE_* are baked in at build time (pass via --build-arg or compose build.args)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_EARLY_ACCESS=false
ARG VITE_PAYMENTS_CLIENT_TOKEN=
ARG VITE_ANTHEM_APP_URL=
ARG VITE_OPS_HUB_URL=

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
    VITE_EARLY_ACCESS=$VITE_EARLY_ACCESS \
    VITE_PAYMENTS_CLIENT_TOKEN=$VITE_PAYMENTS_CLIENT_TOKEN \
    VITE_ANTHEM_APP_URL=$VITE_ANTHEM_APP_URL \
    VITE_OPS_HUB_URL=$VITE_OPS_HUB_URL \
    NODE_OPTIONS=--max-old-space-size=2048

RUN npm run build:docker

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json .npmrc ./
# srvx is used by scripts/docker-serve.mjs (transitive in dev; install explicitly for prod)
RUN npm ci --omit=dev && npm install srvx@0.11.13 --omit=dev --no-save

COPY --from=build /app/dist ./dist
COPY scripts/docker-serve.mjs ./scripts/docker-serve.mjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

USER node
CMD ["node", "scripts/docker-serve.mjs"]
