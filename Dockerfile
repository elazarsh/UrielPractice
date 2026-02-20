# ────────────────────────────────────────────────
# Stage 1: Build Frontend (React/Vite)
# ────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ────────────────────────────────────────────────
# Stage 2: Build Backend (TypeScript → JS)
# ────────────────────────────────────────────────
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npx prisma generate
RUN npm run build

# ────────────────────────────────────────────────
# Stage 3: Production Runner
# ────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Backend production deps + tsx for seed
COPY backend/package*.json ./
RUN npm ci

# Backend compiled code
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/backend/node_modules/@prisma ./node_modules/@prisma
COPY backend/prisma ./prisma

# Frontend built files (served as static by backend)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/uploads

EXPOSE 3001

# Run: migrations → seed → server
CMD sh -c "npx prisma migrate deploy && npx tsx prisma/seed.ts && node dist/index.js"
