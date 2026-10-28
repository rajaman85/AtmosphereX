# AtmosphereX Viva Voce Preparation Guide (Cloud Computing & DevOps)

This document contains **30 comprehensive viva questions and answers** tailored for the B.Tech Computer Science Cloud Computing semester examination. It covers theoretical principles and direct architectural implementations from the AtmosphereX project.

---

### Q1: What is the fundamental difference between Containers and Virtual Machines (VMs)?
**Answer**:
- **Virtual Machines (VMs)** virtualize physical hardware through a Hypervisor (Type 1 or Type 2). Each VM runs a full guest operating system with its own kernel, binaries, libraries, and virtualized memory/devices. This results in heavy resource footprint (GBs) and slow boot times (minutes).
- **Containers** virtualize the operating system kernel. All containers on a host share the underlying host OS kernel, utilizing Linux kernel features like **cgroups** (resource allocation: CPU/RAM) and **namespaces** (isolation: PID, net, mnt, ipc, uts). Containers are lightweight (MBs), start in milliseconds, and offer higher density.
- *In AtmosphereX*: Our frontend and backend containers share the host kernel while maintaining strict process, filesystem, and network isolation.

---

### Q2: What is the distinction between a Container Image and a Running Container?
**Answer**:
- A **Container Image** is an immutable, read-only template consisting of layered filesystems (UnionFS) created by executing build instructions in a `Dockerfile`.
- A **Container** is an active, runnable instance of an image. When started, a thin, read-write layer (container layer) is added on top of the immutable image layers. Any runtime file creations or modifications occur only in this ephemeral read-write layer.

---

### Q3: What is a Kubernetes Pod, and why not schedule individual containers directly?
**Answer**:
- A **Pod** is the smallest deployable atomic execution unit in Kubernetes. It represents a single instance of a running process in the cluster.
- A Pod encapsulates one or more closely coupled containers that share:
  1. **Network Namespace**: An identical IP address and port space (communicating with each other via `localhost`).
  2. **Storage Volumes**: Shared filesystem volumes mounted into container filesystems.
  3. **IPC namespace**: Inter-process communication channels.
- Scheduling pods rather than raw containers allows co-located helper patterns like sidecars (e.g. logging agents or proxy sidecars) to share lifecycle and storage with the main application container.

---

### Q4: What is a Kubernetes Deployment, and what is its relationship to a ReplicaSet?
**Answer**:
- A **Deployment** is a declarative controller that manages stateless pod lifecycles.
- When a Deployment is created, it automatically instantiates and manages a **ReplicaSet**. The ReplicaSet is responsible for ensuring that the desired number of identical pods (`spec.replicas`) are running at all times.
- The Deployment adds declarative update mechanics (Rolling Updates, Rollbacks, Pauses, and Canaries) above the ReplicaSet. When an image version is updated, the Deployment creates a new ReplicaSet and incrementally shifts pods from the old ReplicaSet to the new one.

---

### Q5: Explain the types of Kubernetes Services and how service discovery works.
**Answer**:
- **ClusterIP** (Default): Exposes the service on a cluster-internal IP accessible only within the cluster. Used in AtmosphereX for `postgres-service`, `redis-service`, and `weather-backend`.
- **NodePort**: Exposes the service on each node’s external IP at a static port (in range 30000–32767). Used in AtmosphereX for `weather-frontend` on port `30080`.
- **LoadBalancer**: Provisions an external cloud load balancer (e.g. AWS NLB, GCP Load Balancer) pointing to the NodePorts.
- **ExternalName**: Maps the service to a DNS name via CNAME record.
- **Service Discovery**: Kubernetes runs internal DNS (CoreDNS). When a service named `weather-backend` is created in namespace `atmospherex`, CoreDNS automatically provisions the A-record `weather-backend.atmospherex.svc.cluster.local`, allowing other pods to reach it using just the service name.

---

### Q6: What are Liveness and Readiness Probes, and how do they differ?
**Answer**:
- **Liveness Probe**: Determines if the container is healthy and actively running. If a liveness probe fails consecutively past `failureThreshold`, the `kubelet` terminates and restarts the container.
  - *AtmosphereX implementation*: HTTP GET to `/api/v1/health` verifying backend process responsiveness.
- **Readiness Probe**: Determines whether the container is ready to accept incoming network traffic. If a readiness probe fails, the pod's IP is temporarily removed from the endpoints list of its matching Kubernetes Service, so no traffic is routed to it until it recovers.
  - *AtmosphereX implementation*: HTTP GET to `/api/v1/ready` validating connectivity to PostgreSQL, Redis, and upstream APIs.

---

### Q7: What is a Startup Probe and when should it be configured?
**Answer**:
- A **Startup Probe** disables liveness and readiness checks until the container has finished its initialization routine.
- It is critical for legacy or heavy applications that take minutes to load large models, initialize databases, or warm up caches, preventing the liveness probe from prematurely killing the pod during slow initialization.

---

### Q8: What are Kubernetes ConfigMaps and Secrets, and why keep them separate from container images?
**Answer**:
- **ConfigMaps**: Store non-sensitive configuration parameters (URLs, timeouts, feature flags) as key-value pairs or configuration files.
- **Secrets**: Store sensitive credentials (passwords, tokens, private keys) encoded in base64 or injected securely via volume mounts.
- *Rationale*: Separating configuration from code satisfies 12-Factor App principles. It enables the same immutable container image to be promoted across development, staging, and production clusters simply by attaching different ConfigMaps/Secrets, avoiding credential leakage in version control.

---

### Q9: How do Resource Requests and Limits work in Kubernetes?
**Answer**:
- **Requests** (`spec.resources.requests`): The minimum guaranteed amount of CPU and Memory guaranteed to a pod. The Kubernetes Scheduler uses requests to determine which node has sufficient allocatable capacity to place the pod.
- **Limits** (`spec.resources.limits`): The hard ceiling of resource consumption allowed for the pod.
  - **CPU (Compressible)**: If a pod exceeds its CPU limit, the Linux kernel CFS (Completely Fair Scheduler) throttles the container's CPU cycles; the pod is not terminated.
  - **Memory (Non-compressible)**: If a pod exceeds its memory limit, the Linux kernel Out-Of-Memory (OOM) killer immediately terminates the process with exit code `137` (OOMKilled).

---

### Q10: How does the Horizontal Pod Autoscaler (HPA) function?
**Answer**:
- The **HPA** controller periodically (default: every 15s) polls metrics from the `metrics-server` (or Prometheus Adapter via custom metrics API).
- It calculates the desired replicas using the formula:
  $$\text{Desired Replicas} = \lceil \text{Current Replicas} \times \left( \frac{\text{Current Metric Value}}{\text{Target Metric Value}} \right) \rceil$$
- *In AtmosphereX*: `backend-hpa` monitors `weather-backend` with a target CPU utilization of 70% and memory utilization of 80%, scaling the deployment between 2 and 8 pods dynamically.

---

### Q11: What is Persistent Storage in Kubernetes and how does PVC relate to PV and StorageClass?
**Answer**:
- **PersistentVolume (PV)**: A physical piece of storage provisioned in the cluster (e.g. AWS EBS volume, NFS share, local host disk).
- **PersistentVolumeClaim (PVC)**: A user's request for storage with specific capacity and access modes (`ReadWriteOnce`, `ReadOnlyMany`, `ReadWriteMany`).
- **StorageClass**: Enables dynamic provisioning. When a PVC requests a StorageClass (like `standard` in Minikube), the volume provisioner automatically creates the underlying PV and binds it to the PVC.
- In AtmosphereX, PostgreSQL data is persisted on `postgres-pvc` (2Gi `ReadWriteOnce`), ensuring database integrity even if the pod is recreated on another node.

---

### Q12: Why is a single-node PostgreSQL in Kubernetes considered a demo setup rather than production-ready?
**Answer**:
- A single PostgreSQL pod represents a single point of failure (SPOF).
- Production relational databases require high availability (HA) with:
  1. Primary-standby replication (streaming replication or synchronous commit).
  2. Automated failover mechanisms (e.g. Patroni with Raft/etcd consensus).
  3. Distributed backups (WAL-G, pgBackRest to cloud object storage).
  4. Connection pooling (PgBouncer).
- In our project, we document this explicitly: our single-instance deployment is an exam demonstrator for stateful PVC attachment, while cloud production typically leverages managed services (AWS RDS, Cloud SQL) or CloudNativePG operators.

---

### Q13: What is Ingress in Kubernetes and how does it compare to a NodePort?
**Answer**:
- A **NodePort** opens a high-range port directly on every node's IP. It lacks Layer-7 routing, SSL termination, and requires client knowledge of node IPs and non-standard ports.
- An **Ingress** is an API object that manages external access to services within the cluster, typically via HTTP/HTTPS. An **Ingress Controller** (such as NGINX Ingress) evaluates Layer-7 rules:
  - Route `/api/*` to the `weather-backend` Service.
  - Route `/*` to the `weather-frontend` Service.
  - Handles SSL/TLS certificate termination and host-based virtual hosting (`atmospherex.local`).

---

### Q14: What is Multi-Stage Docker building and why did you use it for the frontend?
**Answer**:
- Multi-stage builds use multiple `FROM` statements in a single Dockerfile to separate the compilation environment from the runtime environment.
- *In AtmosphereX frontend*:
  - **Stage 1 (Node.js 20)**: Installs npm dependencies, compiles TypeScript, and runs `vite build`.
  - **Stage 2 (Nginx 1.27 Alpine)**: Only copies the production HTML/JS/CSS assets from `/app/dist` into Nginx's webroot `/usr/share/nginx/html`.
- *Benefits*:
  1. Reduces image size from ~600MB down to ~25MB.
  2. Eliminates Node.js runtime, compilers, and source code from production, minimizing vulnerability attack surface.

---

### Q15: Why did you implement a multi-tier caching strategy with Redis?
**Answer**:
- External weather APIs have rate limits, network latency (200-800ms), and occasional downtime.
- Redis acts as an in-memory key-value cache with configured Time-To-Live (TTL):
  - Current weather is cached for 10 minutes (`EX 600`).
  - Historical data is cached for 6 hours (`EX 21600`).
- *Impact*:
  1. Reduces API response time from ~400ms to <5ms on cache hits.
  2. Shields the application from upstream rate limits.
  3. Provides **Graceful Degradation**: if the upstream API fails, stale cache is served with a UI warning banner.

---

### Q16: How does the Data Reliability Score work in AtmosphereX?
**Answer**:
- It is an explainable heuristic score from 0% to 100% computed deterministically in the backend based on:
  1. **Data Freshness / Age**: Deducts 1 point per minute of observation age (up to a 40-point penalty).
  2. **Field Completeness**: Checks presence of core parameters (temperature, humidity, wind, pressure) deducting 10 points per missing core field, and 2 points per missing optional field (UV index, visibility).
- It provides users with transparency regarding data freshness without falsely claiming to measure meteorological forecast accuracy.

---

### Q17: What is Prometheus and how does it collect metrics from AtmosphereX?
**Answer**:
- **Prometheus** is an open-source systems monitoring and alerting toolkit that uses a **pull-based** scraping model.
- Our FastAPI backend integrates `prometheus-fastapi-instrumentator`, which exposes application telemetry at `/api/v1/metrics`.
- Prometheus sends HTTP GET requests to this endpoint every 15 seconds, storing time-series data with labels (e.g. endpoint handler, HTTP status code).
- In Kubernetes, discovery occurs either via annotations (`prometheus.io/scrape: "true"`) or a `ServiceMonitor` custom resource.

---

### Q18: What is the purpose of Grafana in this architecture?
**Answer**:
- **Grafana** is a multi-platform open-source analytics and interactive visualization web application.
- It connects to Prometheus as a datasource, executing PromQL queries (e.g., `rate(http_requests_total[1m])`) to render real-time dashboards showing request throughput, p95 latencies, error counts, and HTTP status distributions.
- In AtmosphereX, datasources and dashboards are provisioned via code (`provisioning/dashboards/dashboards.yml`), enabling reproducible infrastructure as code.

---

### Q19: How does the Weather Alert evaluation engine work without overwhelming the upstream API?
**Answer**:
- AtmosphereX implements a background scheduler (`APScheduler`) running every 5 minutes inside the backend service.
- It queries active alert rules in PostgreSQL. For each rule:
  1. It checks `last_triggered` to enforce a 1-hour cooldown window (anti-flapping).
  2. It evaluates conditions (e.g. `temperature > 35`) against current weather.
  3. Because `get_current_weather()` is cached in Redis (10-min TTL), batch evaluations reuse cached data rather than making dozens of upstream API requests.
  4. Triggered events are persisted in `alert_history` and logged.

---

### Q20: What is a Rolling Update and how does Kubernetes guarantee zero downtime?
**Answer**:
- A **Rolling Update** replaces old pod replicas with new pod replicas incrementally.
- In `06-backend.yaml`, we define:
  ```yaml
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  ```
  - `maxSurge: 1`: Kubernetes can create 1 extra pod above the desired replica count during the transition.
  - `maxUnavailable: 0`: Kubernetes will never delete an old pod until the new pod passes its `readinessProbe` and is verified healthy. This guarantees zero dropped requests.

---

### Q21: What happens if a node running a pod crashes in Kubernetes?
**Answer**:
- The **Control Plane** (specifically the `node-controller`) monitors node heartbeats.
- If a node fails to report heartbeats within `node-monitor-grace-period` (default 40s), the node is marked `NotReady`.
- If the outage exceeds `pod-eviction-timeout` (default 5m), the controller initiates eviction:
  - The Deployment's matching ReplicaSet notices the count of ready pods has dropped below `spec.replicas`.
  - The Scheduler immediately binds new pods to surviving, healthy nodes in the cluster.

---

### Q22: What is the role of `kustomization.yaml`?
**Answer**:
- **Kustomize** is a template-free configuration management tool built natively into `kubectl` (`kubectl apply -k`).
- It enables declarative composition of multiple Kubernetes resources (namespaces, deployments, services, configs) into a single deployable unit while applying common labels, annotations, and namespace overrides without duplicating YAML files.

---

### Q23: How does CORS (Cross-Origin Resource Sharing) work in AtmosphereX?
**Answer**:
- When the frontend running on port 3000 calls the backend on port 8000 directly, the browser enforces the Same-Origin Policy (different ports constitute different origins).
- The browser dispatches an HTTP `OPTIONS` preflight request.
- The FastAPI backend includes `CORSMiddleware`, which validates the `Origin` header against `CORS_ORIGINS` and responds with `Access-Control-Allow-Origin`, allowing the browser to execute the cross-origin fetch safely.
- In Docker/Kubernetes production, NGINX proxies `/api` on the same origin, eliminating CORS overhead entirely.

---

### Q24: What is the Twelve-Factor App methodology and how does AtmosphereX adhere to it?
**Answer**:
- Created by Heroku engineers, Twelve-Factor is a methodology for building scalable, maintainable, cloud-native software-as-a-service applications.
- Key principles implemented in AtmosphereX:
  - **Explicit Dependencies**: `requirements.txt` and `package.json` pinned versions.
  - **Config in Environment**: Database URLs, keys, and TTLs injected via environment variables.
  - **Backing Services as Attached Resources**: Redis and Postgres treated as swappable endpoints.
  - **Stateless Processes**: Any backend pod can handle any user request.
  - **Concurrency via Process Model**: Scaling backend replicas with HPA.
  - **Disposability**: Graceful shutdown handles sigterm signals properly.

---

### Q25: Explain how the Cloud Operations Center in AtmosphereX demonstrates real cloud metrics rather than simulated data.
**Answer**:
- The Cloud Operations page (`/ops`) calls `GET /api/v1/ops/status`.
- This endpoint interrogates real runtime state:
  1. Performs a live `SELECT 1` query to PostgreSQL and reports actual database connectivity.
  2. Executes `redis-cli ping` and computes real cache hit/miss statistics.
  3. Reads internal memory counters tracking real upstream Open-Meteo request counts and failure rates.
  4. Checks for `/var/run/secrets/kubernetes.io/serviceaccount` to dynamically determine if it is running inside Kubernetes, Docker Compose, or Local mode.
- When running outside Kubernetes, it explicitly displays "Local Compose Mode" and "Metrics unavailable" rather than fabricating fake pod counts.

---

### Q26: What is the difference between Synchronous and Asynchronous HTTP in FastAPI?
**Answer**:
- In synchronous Python (standard WSGI like Flask), each incoming request blocks an OS thread while awaiting network I/O (e.g. weather API call).
- FastAPI is built on ASGI (Starlette) and uses Python’s `asyncio` event loop.
- In AtmosphereX, API calls use `async with httpx.AsyncClient()`. When awaiting upstream Open-Meteo data, the event loop yields control and processes hundreds of other concurrent incoming requests on the same single thread, resulting in dramatically higher concurrency and lower memory consumption.

---

### Q27: How does AtmosphereX compare weather across multiple cities efficiently?
**Answer**:
- The `/api/v1/compare` endpoint accepts up to 4 cities.
- Rather than querying each city sequentially (which would sum the latencies: $4 \times 300\text{ms} = 1200\text{ms}$), it uses `asyncio.gather(*[get_current_weather(city) for city in cities])`.
- All requests execute concurrently; the total response time equals the single slowest request (~300ms total), illustrating non-blocking asynchronous programming.

---

### Q28: How does the Leaflet Global Weather Explorer render maps in dark mode?
**Answer**:
- Leaflet loads standard OpenStreetMap raster tiles.
- To maintain the dark navy aesthetic without paying for custom tile providers, AtmosphereX applies hardware-accelerated CSS filters to the `.leaflet-tile` class:
  ```css
  filter: brightness(0.7) saturate(0.8) hue-rotate(180deg) invert(0.85);
  ```
- This inverts and hue-shifts the map tiles dynamically in the browser, providing a sleek dark-mode aesthetic with zero external tile dependencies or API keys.

---

### Q29: What is the distinction between Short-Term Weather and Long-Term Climate in your application?
**Answer**:
- **Weather** describes atmospheric conditions over short time scales (hours to days) characterized by high chaotic variability (temperature swings, rainfall probability).
- **Climate** represents statistical aggregates and patterns (means, variability, extremes) over extended multi-year baselines.
- In AtmosphereX:
  - Weather forecasts are capped at 7–16 days and clearly labeled as probabilistic predictions.
  - The Climate Lab queries 1 to 10 years of archived data, calculates monthly means and precipitation sums, and displays an explicit baseline note stating that the statistics represent observed historical records, not climate projections.

---

### Q30: How does your GitHub Actions CI/CD pipeline ensure quality before deployment?
**Answer**:
- The pipeline (`.github/workflows/ci.yml`) triggers on pull requests and pushes across three stages:
  1. **Backend Testing**: Spins up an ephemeral Redis container service, installs Python 3.12, and runs automated pytest unit and integration tests.
  2. **Frontend Validation**: Sets up Node.js 20, runs TypeScript strict type checking (`tsc`), and executes Vite production bundling.
  3. **Docker Buildx Verification**: Builds both Docker images with Buildx caching, verifying that Dockerfiles build without syntax or dependency errors.
  4. **Conditional Publishing**: If registry secrets are present, it tags and pushes images to GHCR (GitHub Container Registry).
