# OCI Registry WebUI

A web-based UI for browsing and managing OCI (Docker) container registries. 

(Just a vibe coding toy, NOT ready for production)

- Browse repositories with grid or tree view (grouped by namespace)
- Inspect tags, manifests, layers, and multi-platform images
- View repository tags in a single-column table with wrapping names, digest previews, and inspect/delete actions
- Delete manifests directly from the UI
- Supports any OCI-compliant registry (Docker Registry v2, Harbor, GHCR, etc.)
- Single or multi-registry mode

Image details wrap long tags, digests, and JSON values on narrow screens. Image
config and raw manifest/index JSON use 24rem-tall shadcn/ui scroll areas;
scroll inside each panel to read the full document without covering other cards.

## Quick Start

```yaml
# docker-compose.yml
services:
  oci-webui:
    image: ghcr.io/koitococo/oci-webui:latest
    ports:
      - "3000:3000"
    environment:
      - AUTH_SECRET=change-me        # openssl rand -base64 32
      - REGISTRY_URL=https://registry.example.com
      - REGISTRY_NAME=My Registry    # optional display name
```

```bash
docker compose up -d
```

Then open http://localhost:3000 and sign in with your registry credentials.

## Configuration

All configuration is done via environment variables.

### Required

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Secret for encrypting session JWTs. Generate with `openssl rand -base64 32` |
| `REGISTRY_URL` | URL of your OCI registry (e.g. `https://registry.example.com`) |

### Optional

| Variable | Default | Description |
|---|---|---|
| `REGISTRY_NAME` | hostname from URL | Display name for the registry |
| `AUTH_URL` | `http://localhost:3000` | Public URL of this app |

For production self-hosting, explicitly set `AUTH_URL` to the app's public URL (for example, `https://registry-ui.example.com`). Behind a reverse proxy, use `AUTH_TRUST_HOST=true` only when the trusted proxy correctly overwrites forwarded headers.

### Multi-Registry Mode

To connect to multiple registries, create a JSON config file:

```json
{
  "registries": [
    { "name": "Production", "url": "https://registry.prod.example.com" },
    { "name": "Staging", "url": "https://registry.staging.example.com" }
  ]
}
```

Mount it into the container and set `REGISTRIES_CONFIG_PATH`:

```yaml
services:
  oci-webui:
    image: ghcr.io/koitococo/oci-webui:latest
    ports:
      - "3000:3000"
    environment:
      - AUTH_SECRET=change-me
      - REGISTRIES_CONFIG_PATH=/config/registries.json
    volumes:
      - ./registries.json:/config/registries.json:ro
```

When `REGISTRIES_CONFIG_PATH` is set, `REGISTRY_URL` and `REGISTRY_NAME` are ignored. A registry selector will appear on the login page.

## Build from Source

Use Node.js 26 and pnpm 10.28.2.

The latest TypeScript 7 and typescript-eslint 8.71.2 are still incompatible; `pnpm lint` refuses to run with this combination and has not passed.

```bash
pnpm install
pnpm build
pnpm start
```

Or with Docker:

```bash
docker build -t oci-webui .
docker run -p 3000:3000 \
  -e AUTH_SECRET=change-me \
  -e REGISTRY_URL=https://registry.example.com \
  oci-webui
```
