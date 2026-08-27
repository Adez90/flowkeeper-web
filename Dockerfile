FROM node:22-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite inlines import.meta.env.VITE_* into the bundle at build time, not at
# container start — these have to be real env vars during `npm run build`,
# not something the running container can pick up later. ARG values are
# exposed as env vars to RUN automatically, so no separate ENV needed.
# Omitted entirely, these silently fall back to the localhost defaults coded
# in src/auth/oidcConfig.ts and src/api/client.ts (confirmed live: a build
# with none of these set shipped an image that tried to reach
# localhost:8082 from a real browser).
ARG VITE_API_BASE_URL
ARG VITE_KEYCLOAK_AUTHORITY
ARG VITE_KEYCLOAK_CLIENT_ID
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist /usr/share/nginx/html
EXPOSE 80
