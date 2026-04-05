# ============================================================
# Stage 1: Build frontend
# ============================================================
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --ignore-scripts
COPY frontend/ ./
# Собираем в dist/ внутри стадии (outDir переопределяем через CLI)
RUN npx vite build --outDir dist --emptyOutDir

# ============================================================
# Stage 2: Build backend (compile TypeScript)
# ============================================================
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ============================================================
# Stage 3: Production dependencies (с компиляцией нативных модулей)
# ============================================================
FROM node:20-alpine AS prod-deps
WORKDIR /app/backend
RUN apk add --no-cache python3 make g++
COPY backend/package*.json ./
RUN npm ci --only=production

# ============================================================
# Stage 4: Production image
# ============================================================
FROM node:20-alpine AS production
WORKDIR /app

COPY --from=prod-deps /app/backend/node_modules ./backend/node_modules/
COPY --from=backend-build /app/backend/dist ./backend/dist/
COPY --from=backend-build /app/backend/drizzle ./backend/drizzle/
# frontend собран в /app/frontend/dist, public/ файлы (sw.js, manifest.json) тоже туда
COPY --from=frontend-build /app/frontend/dist ./backend/dist/public/

RUN mkdir -p /app/data

EXPOSE 3000
ENV NODE_ENV=production
ENV DB_PATH=/app/data/momentum.db
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -q -O- http://localhost:3000/api/health || exit 1

CMD ["node", "backend/dist/app.js"]
