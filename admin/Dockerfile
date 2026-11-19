# ============================================================
# MindCare — Admin / Doctor panel (React + Vite) → static files on nginx
# Build:  docker build -t mindcare-admin ./admin
# ============================================================

# ---------- Stage 1: build ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Vite bakes VITE_* values into the JS at build time
ARG VITE_BACKEND_URL=http://localhost:4000
ARG VITE_PATIENT_APP_URL=http://localhost:5173
ARG VITE_CLINIC_TZ=Asia/Karachi
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL \
    VITE_PATIENT_APP_URL=$VITE_PATIENT_APP_URL \
    VITE_CLINIC_TZ=$VITE_CLINIC_TZ

COPY . .
RUN npm run build

# ---------- Stage 2: serve ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
