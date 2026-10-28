# AtmosphereX Docker Architecture & Operations Guide

## 1. Overview

AtmosphereX uses Docker Compose to orchestrate 6 interconnected services in a single-command local development or evaluation environment.

| Service Name | Container Name | Image / Base | Internal Port | Host Port | Purpose |
|--------------|----------------|--------------|---------------|-----------|---------|
| `weather-frontend` | `atmospherex-frontend` | `nginx:1.27-alpine` (multi-stage) | 80 | 3000 | Static SPA hosting & API proxy |
| `weather-backend` | `atmospherex-backend` | `python:3.12-slim` | 8000 | 8000 | FastAPI REST API & worker |
| `weather-db` | `atmospherex-db` | `postgres:16-alpine` | 5432 | None | Persistent relational storage |
| `weather-redis` | `atmospherex-redis` | `redis:7.4-alpine` | 6379 | None | In-memory response caching |
| `prometheus` | `atmospherex-prometheus` | `prom/prometheus:v2.54.1` | 9090 | 9090 | Metric scraping & TSDB |
| `grafana` | `atmospherex-grafana` | `grafana/grafana:11.2.0` | 3000 | 3001 | Observability dashboards |

---

## 2. Docker Best Practices Implemented

1. **Multi-Stage Builds (`frontend/Dockerfile`)**:
   - Stage 1 compiles TypeScript and builds Vite distribution files with Node 20.
   - Stage 2 copies only the compiled `/dist` directory into an ultra-lean NGINX Alpine image (~25MB total image size).
   - Node tooling and `node_modules` are completely eliminated from the final production container.

2. **Non-Root Application Users**:
   - Both `backend/Dockerfile` and `frontend/Dockerfile` create unprivileged users (`appuser:appgroup`) to prevent privilege escalation vulnerabilities.

3. **Container Health Checks**:
   - Every service defines native health checks with intervals, timeouts, and restart policies.
   - Services use `depends_on: { condition: service_healthy }` to ensure PostgreSQL and Redis are ready before FastAPI attempts database connection.

4. **Internal Service Networking & Port Isolation**:
   - Containers communicate via a custom bridge network (`atmospherex-net`) using DNS service names (`weather-db`, `weather-redis`, `weather-backend`).
   - PostgreSQL and Redis do not expose external host ports by default, preventing unintended external exposure.

5. **Volume Persistence**:
   - Data persists across container restarts using named volumes:
     - `postgres_data`
     - `redis_data`
     - `prometheus_data`
     - `grafana_data`

---

## 3. Quickstart & Deployment Commands

### Prerequisites
- Docker Engine 24+ and Docker Compose v2+ installed.
- Ensure ports `3000`, `3001`, `8000`, and `9090` are not in use.

### Step 1: Clone & Configure Environment
```bash
cd atmospherex
cp .env.example .env
```

### Step 2: Build and Start All Containers
```bash
docker compose up --build -d
```

### Step 3: Verify Container Health
```bash
docker compose ps
```
All containers should display status `Up (healthy)`.

### Step 4: Access Application Endpoints
- **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Prometheus UI**: [http://localhost:9090](http://localhost:9090)
- **Grafana Dashboard**: [http://localhost:3001](http://localhost:3001) (Credentials: `admin` / `atmospherex123`)

---

## 4. Operational Commands & Maintenance

### Stream Logs from Specific Service
```bash
# View backend logs
docker compose logs -f weather-backend

# View frontend access/proxy logs
docker compose logs -f weather-frontend
```

### Run Pytest Tests Inside the Backend Container
```bash
docker compose exec weather-backend pytest -v tests/
```

### Inspect Redis Cache
```bash
docker compose exec weather-redis redis-cli info stats
docker compose exec weather-redis redis-cli keys "*"
```

### Database Management & Shell
```bash
docker compose exec weather-db psql -U atmospherex -d atmospherex_db -c "\dt"
```

### Graceful Teardown
```bash
# Stop containers without removing persistent data
docker compose down

# Stop containers and erase volumes (clean state reset)
docker compose down -v
```
