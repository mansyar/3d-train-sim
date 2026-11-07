# syntax=docker/dockerfile:1

# Build stage: Node 24 + pinned pnpm (package.json "packageManager" field).
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
# pnpm-workspace.yaml is pnpm 11's settings file; it carries the `overrides`
# recorded in the lockfile, so leaving it out fails the frozen install with
# ERR_PNPM_LOCKFILE_CONFIG_MISMATCH.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Serve stage: nginx serving only the static PWA output.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-security-headers.conf /etc/nginx/conf.d/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
