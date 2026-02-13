# OCI Registry WebUI

# Start development server
dev:
    pnpm dev

# Build for production
build:
    pnpm build

# Start production server
start:
    pnpm start

# Run linter
lint:
    pnpm lint

# Format code
fmt:
    pnpx oxfmt --write src/

# Type-check
type-check:
    pnpx tsgo --noEmit

# Docker build
docker-build:
    docker build -t oci-webui .

# Start docker-compose stack
docker-up:
    docker compose up -d

# Stop docker-compose stack
docker-down:
    docker compose down
