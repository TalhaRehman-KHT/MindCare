# ============================================================
# MindCare — Patient app (React + Vite) → static files on nginx
# Build:  docker build -t mindcare-frontend ./frontend
# ============================================================

# ---------- Stage 1: build ----------
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first (cached unless package files change)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Vite bakes VITE_* values into the JS at build time,
# so they are passed as build arguments (not runtime env).
ARG VITE_BACKEND_URL=http://localhost:4000
ARG VITE_ADMIN_PANEL_URL=http://localhost:5174
ARG VITE_CLINIC_TZ=Asia/Karachi
ARG VITE_SUPPORT_EMAIL=support@example.com
ARG VITE_SUPPORT_PHONE="+92 000 0000000"
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL \
    VITE_ADMIN_PANEL_URL=$VITE_ADMIN_PANEL_URL \
    VITE_CLINIC_TZ=$VITE_CLINIC_TZ \
    VITE_SUPPORT_EMAIL=$VITE_SUPPORT_EMAIL \
    VITE_SUPPORT_PHONE=$VITE_SUPPORT_PHONE

COPY . .
RUN npm run build

# ---------- Stage 2: serve ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
