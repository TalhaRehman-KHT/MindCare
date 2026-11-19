# ============================================================
# MindCare — Node/Express API
# Build:  docker build -t mindcare-backend ./backend
# Secrets come from env_file at runtime, never baked into the image.
# ============================================================
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Production dependencies only (nodemon / concurrently are skipped)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# App source (.dockerignore keeps out node_modules, venv and .env)
COPY --chown=node:node . .

# Run as the unprivileged "node" user that ships with the image
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/ >/dev/null || exit 1
CMD ["node", "server.js"]
