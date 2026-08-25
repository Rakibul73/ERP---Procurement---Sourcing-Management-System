# ERP Windows Build — Docker cross-compilation
# Builds ERP.exe without requiring Go/Wails/Node locally.
#
# Usage (from erp/ directory):
#   docker build -t erp-builder -f build/Dockerfile .
#   docker create --name erp-tmp erp-builder
#   docker cp erp-tmp:/dist/ERP.exe ./dist/ERP.exe
#   docker rm erp-tmp

FROM node:22-bookworm AS frontend

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build


FROM golang:1.26-bookworm AS backend

RUN apt-get update && apt-get install -y \
    gcc-mingw-w64-x86-64 \
    && rm -rf /var/lib/apt/lists/*

RUN go install github.com/wailsapp/wails/v2/cmd/wails@latest

WORKDIR /app

# Cache Go dependencies
COPY backend/go.mod backend/go.sum* ./
RUN go mod download

# Copy backend source
COPY backend/ .

# Copy built frontend
COPY --from=frontend /app/frontend/dist ./frontend/dist

# Build Windows exe
RUN CGO_ENABLED=1 GOOS=windows GOARCH=amd64 CC=x86_64-w64-mingw32-gcc \
    wails build -ldflags "-s -w" -platform windows/amd64


FROM scratch AS output
COPY --from=backend /app/build/bin/ERP.exe /dist/ERP.exe
