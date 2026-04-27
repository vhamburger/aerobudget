# Build stage for Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
# We will copy package.json later when we create the frontend, 
# for now we'll just prepare the directory.
# This stage might fail if frontend doesn't exist, so we'll just copy the whole project later
COPY frontend/package*.json ./
RUN if [ -f "package.json" ]; then npm install --legacy-peer-deps; fi
COPY frontend/ ./
RUN if [ -f "package.json" ]; then npm run build; fi

# Build stage for Backend (Go)
FROM golang:alpine AS backend-builder
WORKDIR /app
# Install build dependencies if needed (e.g., for CGO if we use it, but we plan to use pure Go SQLite)
RUN apk add --no-cache gcc musl-dev
COPY go.mod ./
# COPY go.sum ./ # Uncomment when go.sum exists
RUN go mod download
COPY . .
# We will build the Go binary here. CGO_ENABLED=0 for static binary if possible, 
# but modernc.org/sqlite works without CGO. Let's use CGO_ENABLED=0 just in case.
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o aerobudget .

# Final stage
FROM alpine:latest
WORKDIR /app

# Install poppler-utils for robust pdftotext extraction (useful for OCR/PDF text parsing)
# also tzdata for timezone support
RUN apk add --no-cache poppler-utils tzdata ca-certificates

# Copy the binary from backend-builder
COPY --from=backend-builder /app/aerobudget .

# Copy frontend dist (if any) to serve static files
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Ensure data directory exists
RUN mkdir -p /app/data/invoices

# Set Environment Variables
ENV PORT=8080
ENV DB_PATH=/app/data/aerobudget.db
ENV INVOICE_WATCH_DIR=/app/data/invoices

EXPOSE 8080

CMD ["./aerobudget"]
