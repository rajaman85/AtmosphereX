# AtmosphereX 5–8 Minute Examination Demo Script

This script provides an exact, step-by-step presentation flow for presenting AtmosphereX during your B.Tech Cloud Computing semester practical examination or project evaluation.

---

## ⏱️ Timeline & Presentation Structure

| Minute | Phase | Key Action / Screen | Talking Points |
|--------|-------|---------------------|----------------|
| **0:00 - 1:00** | Introduction & Architecture | Architecture diagram & Slides / Terminal | Problem statement, cloud-native principles, technology stack |
| **1:00 - 2:30** | Web Application Tour | Browser (`http://localhost:3000`) | Weather Center, Explorer Map, Climate Lab, Air Quality |
| **2:30 - 3:30** | Cloud Ops & Real Metrics | Cloud Operations page (`/ops`) | Real backend metrics, Redis hit rate, upstream error tracking |
| **3:30 - 5:00** | Docker & Kubernetes Demo | Terminal (Minikube / Docker Compose) | Pod status, Services, PVC, ConfigMaps, Secrets |
| **5:00 - 6:30** | Scaling & Rolling Update | Terminal | Manual scaling (`kubectl scale`), zero-downtime rollout |
| **6:30 - 7:30** | Self-Healing / Fault Recovery | Terminal & Browser | Deleting a pod, automatic recreation, graceful degradation |
| **7:30 - 8:00** | Summary & Viva Handover | Architecture slide / Swagger UI | Summary of 12-Factor compliance, opening for questions |

---

## 📝 Detailed Step-by-Step Script

### Minute 0:00 – 1:00: Introduction & Architecture

**Action**: Open `docs/ARCHITECTURE.md` or display the system architecture diagram.

> *"Good morning, respected examiners. Today I am presenting **AtmosphereX**, a cloud-native weather intelligence and climate analysis platform built for our Cloud Computing semester examination.*
>
> *Unlike standard web apps, AtmosphereX is built strictly upon cloud-native principles: decoupled microservices, containerization with multi-stage Docker builds, Kubernetes orchestration with Horizontal Pod Autoscaling, persistent volume integration, Redis multi-tier caching, and Prometheus/Grafana observability.*
>
> *All weather and climate data is 100% genuine, queried asynchronously from the Open-Meteo REST API, and cached dynamically."*

---

### Minute 1:00 – 2:30: Live Application Demonstration

**Action**: Open `http://localhost:3000` in the browser.

1. **Weather Command Center (`/`)**:
   - Type `"Tokyo"` in the search bar and select from autocomplete.
   - Point out:
     - Real-time temperature, feels-like, wind speed, pressure, UV index.
     - 24-hour interactive temperature and precipitation area chart.
     - 7-day weather forecast.
     - **Explainable Reliability Score**: *"Notice this 98% reliability score in the top right. It is dynamically computed based on data freshness and field completeness."*
     - **Smart Weather Planner**: *"Here we offer practical activity suggestions based on weather rules, like cycling suitability or rain gear."*
     - Save Tokyo to favorites by clicking the star icon.

2. **Global Weather Explorer (`/explorer`)**:
   - Click on the interactive Leaflet map to drop pins in London, New York, and Sydney.
   - Show how each pin queries real weather and displays current conditions in an inverted dark-mode map tile aesthetic.

3. **Climate Intelligence Lab (`/climate`)**:
   - Search for `"Paris"`, select a 5-year analysis range.
   - *"Here we clearly distinguish short-term weather from long-term climate. This page pulls multi-year historical data from the Open-Meteo Archive, computing monthly temperature baselines and precipitation totals."*
   - Click **Export CSV** to demonstrate instantaneous client-side report download.

4. **Air Quality & Health (`/air-quality`)**:
   - Search `"Delhi"`.
   - Show the US AQI gauge, pollutant breakdowns (PM2.5, PM10, Ozone, NO2), and UV index warning.

---

### Minute 2:30 – 3:30: Cloud Operations Center (Key Unique Feature)

**Action**: Navigate to `/ops` (Cloud Operations Center).

> *"One unique contribution in AtmosphereX is our dedicated Cloud Operations Center designed specifically for examiner review. Everything on this dashboard reflects live infrastructure state:*
>
> - *It detects whether we are running in **Kubernetes Mode** or **Docker Compose Mode**.*
> - *It executes live health checks against PostgreSQL and Redis.*
> - *It tracks real upstream weather API request counts and error rates.*
> - *It displays live Redis cache hit-rates (currently at XX%).*
> - *Notice our honest engineering approach: when running outside Kubernetes, it explicitly says 'Local Mode' rather than fabricating fake pod numbers."*

---

### Minute 3:30 – 5:00: Kubernetes Cluster Inspection

**Action**: Switch to the terminal.

Execute the following commands in sequence:

```bash
# 1. View all resources in the namespace
kubectl get all -n atmospherex
```
> *"As you can see, our cluster is running under namespace `atmospherex`. We have two backend pods, two frontend pods, a Redis deployment, and a PostgreSQL deployment."*

```bash
# 2. Inspect ConfigMaps and Secrets
kubectl get configmaps,secrets -n atmospherex
```
> *"Configurations like API URLs and TTLs are decoupled into `ConfigMap`, while database credentials and signing keys are securely managed via Kubernetes `Secrets`."*

```bash
# 3. Inspect PersistentVolumeClaim
kubectl get pvc -n atmospherex
```
> *"Our PostgreSQL database utilizes a `PersistentVolumeClaim` with `ReadWriteOnce` access mode, ensuring data durability across container restarts."*

---

### Minute 5:00 – 6:30: Live Scaling & Zero-Downtime Rollout

**Action**: Demonstrate horizontal scaling in the terminal.

```bash
# Scale the backend from 2 to 4 replicas
kubectl scale deployment/weather-backend --replicas=4 -n atmospherex

# Watch pods immediately transition to Running
kubectl get pods -n atmospherex -l app=weather-backend
```
> *"Notice how the Kubernetes ReplicaSet instantly provisions two additional backend pods to distribute load."*

Now demonstrate a Zero-Downtime Rolling Update:
```bash
# Trigger rollout
kubectl rollout restart deployment/weather-backend -n atmospherex

# Watch the rolling status
kubectl rollout status deployment/weather-backend -n atmospherex
```
> *"Notice the rolling update strategy: because we defined `maxUnavailable: 0` and configured HTTP readiness probes on `/api/v1/ready`, Kubernetes will never terminate an existing pod until the replacement pod passes health verification. The user experiences zero downtime."*

---

### Minute 6:30 – 7:30: Self-Healing & Fault Tolerance

**Action**: Simulate a catastrophic pod failure.

```bash
# Get the first backend pod name
POD_NAME=$(kubectl get pods -n atmospherex -l app=weather-backend -o jsonpath="{.items[0].metadata.name}")

# Force delete the pod
kubectl delete pod $POD_NAME -n atmospherex --now

# Check pods immediately
kubectl get pods -n atmospherex -l app=weather-backend
```
> *"I have just abruptly killed a running backend pod. Notice how the Kubernetes control plane instantly detected the discrepancy between the desired replica count and current state, automatically spinning up a replacement pod in seconds. This demonstrates true cloud-native self-healing."*

Now demonstrate Caching Graceful Degradation:
- Make a query on the frontend for London.
- Show the sub-5ms response time from Redis.

---

### Minute 7:30 – 8:00: Conclusion & Viva Handover

> *"In conclusion, AtmosphereX proves that a modern weather application can be engineered as a resilient, observable, cloud-native system. We have covered:
> 1. Decoupled microservices architecture.
> 2. Multi-stage Docker optimization and non-root security.
> 3. Declarative Kubernetes manifests with HPA and PVC.
> 4. Multi-tier Redis caching with graceful degradation.
> 5. Full observability via Prometheus and Grafana.
>
> Thank you, and I am now ready for your questions."*
