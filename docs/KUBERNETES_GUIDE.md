# AtmosphereX Kubernetes Deployment & Cloud-Native Guide

## 1. Overview

AtmosphereX features production-ready Kubernetes manifests tested for local cluster deployment using **Minikube** or **kind**.

All manifests reside in the `deploy/k8s/` directory and can be deployed with a single command via `kubectl apply -k deploy/k8s/`.

---

## 2. Cluster Architecture & Resource Map

| Resource Type | Resource Name | Replicas | Key Probes / Specs |
|---------------|---------------|----------|-------------------|
| `Namespace` | `atmospherex` | N/A | Dedicated workload isolation |
| `ConfigMap` | `atmospherex-config` | N/A | Environment configuration |
| `Secret` | `atmospherex-secrets` | N/A | Credentials and signing keys |
| `PVC` | `postgres-pvc` | 1 (2Gi) | ReadWriteOnce storage |
| `Deployment` | `postgres-deployment` | 1 | `pg_isready` liveness & readiness |
| `Service` | `postgres-service` | ClusterIP | Port 5432 |
| `Deployment` | `redis-deployment` | 1 | `redis-cli ping` readiness |
| `Service` | `redis-service` | ClusterIP | Port 6379 |
| `Deployment` | `weather-backend` | 2 (scales to 8) | `/api/v1/health` & `/api/v1/ready` probes |
| `Service` | `weather-backend` | ClusterIP | Port 8000 |
| `HPA` | `backend-hpa` | 2-8 | Target: CPU 70%, Memory 80% |
| `Deployment` | `weather-frontend` | 2 | `/nginx-health` probe |
| `Service` | `weather-frontend` | NodePort | Port 80 -> NodePort 30080 |
| `Ingress` | `atmospherex-ingress` | N/A | Host: `atmospherex.local` |

---

## 3. Minikube Step-by-Step Deployment Walkthrough

### Step 1: Start Minikube Cluster
```bash
minikube start --cpus=4 --memory=6144 --driver=docker
```

### Step 2: Enable Addons (Ingress & Metrics Server)
```bash
# Enable Ingress controller
minikube addons enable ingress

# Enable Metrics Server for HPA autoscaling
minikube addons enable metrics-server
```

### Step 3: Build Container Images
Build the container images locally:
```bash
# Build backend
docker build -t atmospherex-backend:latest ./backend

# Build frontend
docker build -t atmospherex-frontend:latest ./frontend
```

### Step 4: Load Images into Minikube
Load the locally built images directly into the Minikube virtual environment:
```bash
minikube image load atmospherex-backend:latest
minikube image load atmospherex-frontend:latest

# Verify loaded images
minikube image ls | grep atmospherex
```

### Step 5: Apply Kubernetes Manifests
Deploy the complete stack in order using Kustomize:
```bash
kubectl apply -k deploy/k8s/
```

### Step 6: Verify Pod & Service Status
```bash
# Check all resources in the atmospherex namespace
kubectl get all -n atmospherex

# Expected output shows:
# - postgres-deployment (1/1 Running)
# - redis-deployment (1/1 Running)
# - weather-backend (2/2 Running)
# - weather-frontend (2/2 Running)
# - backend-hpa (HPA targeting deployment)
```

---

## 4. Accessing the Application

### Option A: Using Minikube Service URL (Simplest)
```bash
minikube service weather-frontend -n atmospherex
```
This automatically opens your browser to the allocated service port.

### Option B: NodePort Direct Access
```bash
minikube ip
# If Minikube IP is 192.168.49.2, browse to:
# http://192.168.49.2:30080
```

### Option C: Ingress Routing with Local Host Resolution
1. Get Ingress IP:
   ```bash
   kubectl get ingress atmospherex-ingress -n atmospherex
   ```
2. Add an entry to your `hosts` file (`C:\Windows\System32\drivers\etc\hosts` or `/etc/hosts`):
   ```
   127.0.0.1 atmospherex.local
   ```
   *(or the Minikube IP obtained from `minikube ip`)*
3. In a separate terminal, start the Minikube tunnel (Windows/macOS):
   ```bash
   minikube tunnel
   ```
4. Browse to [http://atmospherex.local](http://atmospherex.local).

---

## 5. Demonstration of Cloud-Native Exam Scenarios

### Scenario 1: Manual Pod Scaling
Demonstrate horizontal scaling under examiner review:
```bash
# Scale backend to 4 replicas
kubectl scale deployment/weather-backend --replicas=4 -n atmospherex

# Watch pods launch in real time
kubectl get pods -n atmospherex -l app=weather-backend -w

# Revert to 2 replicas
kubectl scale deployment/weather-backend --replicas=2 -n atmospherex
```

### Scenario 2: Zero-Downtime Rolling Update & Rollback
Demonstrate rolling update without dropping user requests:
```bash
# Trigger an image update
kubectl set image deployment/weather-backend backend=atmospherex-backend:v1.0.1 -n atmospherex

# Watch the rolling rollout status
kubectl rollout status deployment/weather-backend -n atmospherex

# Inspect rollout revision history
kubectl rollout history deployment/weather-backend -n atmospherex

# Rollback immediately to previous revision
kubectl rollout undo deployment/weather-backend -n atmospherex
```

### Scenario 3: Self-Healing / Fault Recovery
Demonstrate automatic pod recovery when a container crashes:
```bash
# Get the pod name
POD_NAME=$(kubectl get pods -n atmospherex -l app=weather-backend -o jsonpath="{.items[0].metadata.name}")

# Simulate catastrophic pod failure by deleting the pod
kubectl delete pod $POD_NAME -n atmospherex

# Verify that the ReplicaSet immediately spawns a healthy replacement pod
kubectl get pods -n atmospherex -l app=weather-backend
```

### Scenario 4: Observing HPA Metrics
```bash
kubectl get hpa backend-hpa -n atmospherex
```

---

## 6. Teardown & Cleanup
To completely delete all Kubernetes resources created for AtmosphereX:
```bash
kubectl delete -k deploy/k8s/
# Or delete the namespace directly:
kubectl delete namespace atmospherex
```
