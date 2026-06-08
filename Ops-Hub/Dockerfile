# So1o Ops Hub — static SPA behind nginx

FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SO1O_APP_URL=https://www.solofreelancer.com
ARG VITE_ANTHEM_APP_URL=https://an1hem.app
ARG VITE_SITE_URL=https://hq.solofreelancer.com

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
    VITE_SO1O_APP_URL=$VITE_SO1O_APP_URL \
    VITE_ANTHEM_APP_URL=$VITE_ANTHEM_APP_URL \
    VITE_SITE_URL=$VITE_SITE_URL

RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
