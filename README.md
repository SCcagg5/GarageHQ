# GarageHQ Hosting Infrastructure

🚀 **GarageHQ Hosting** is a self-hosted infrastructure providing an **S3-compatible object storage service**, a **Web UI** for management, and a **reverse proxy (Traefik)** for secure routing.

This stack is built with **Docker & Docker Compose** and is designed for simplicity, reproducibility, and production readiness.

---

## 📑 Project Overview

| Component     | Description                                                               |
| ------------- | ------------------------------------------------------------------------- |
| **Garage**    | Core S3-compatible object storage engine.                                 |
| **Garage-UI** | Web-based management interface for Garage.                                |
| **Traefik**   | Reverse proxy & TLS termination with support for HTTPS and basic auth 🔒. |

---

## 🏗 Architecture

| Layer         | Service   | Ports (exposed)           | Purpose                                           |
| ------------- | --------- | ------------------------- | ------------------------------------------------- |
| **Proxy**     | Traefik   | 8080 (HTTP), 8443 (HTTPS) | Routes external traffic, enforces TLS 🔒.         |
| **Storage**   | Garage    | Internal (3900–3909)      | Provides S3 API, replication, and metadata store. |
| **Interface** | Garage-UI | Routed via Traefik        | User-friendly UI to interact with Garage.         |

---

## �� Project Structure

| Directory / File  | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `garage/`         | Core Garage source & Dockerfile                |
| `garage-ui/`      | Web UI source & Dockerfile                     |
| `traefik/`        | Reverse proxy configuration & certs            |
| `configs/`        | Collected YAML/TOML/JSON configs               |
| `scripts/`        | Utility scripts (build/deploy)                 |
| `setup.sh`        | Project initialization script (must run first) |

---

## ⚙️ Services (from `docker-compose`)

| Service       | Image       | Build Context | Key Volumes                                    |
| ------------- | ----------- | ------------- | ---------------------------------------------- |
| **garage**    | `garagehq`  | `./garage`    | `/var/lib/garage/meta`, `/var/lib/garage/data` |
| **garage-ui** | `garage-ui` | `./garage-ui` | *(none)*                                       |
| **traefik**   | `traefik`   | `./traefik`   | `/etc/traefik/certs/server` (TLS certificates) |

---

## 🌍 Environment Variables

Below are all environment variables grouped by service, with their purpose explained.

### Garage (Object Storage)

| Variable             | Usage                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| `ADMIN_TOKEN`        | Admin API token for Garage management (keep secret).                     |
| `METRICS_TOKEN`      | Token required to access the metrics endpoint (Prometheus scraping).     |
| `KEY_ID`             | Access key ID for S3-compatible authentication.                          |
| `KEY_SECRET`         | Access key secret for S3-compatible authentication.                      |
| `RPC_SECRET`         | Secret used for internal RPC authentication between nodes.               |
| `ROOT_DOMAIN`        | Root domain used for Garage object storage resolution (e.g., `.garage`). |
| `S3_REGION`          | Default region string for S3 requests (e.g., `garage`).                  |
| `REPLICATION_FACTOR` | Number of replicas per object across the cluster (default `1`).          |
| `COMPRESSION_LEVEL`  | Compression setting for stored data (`0` = disabled).                    |
| `USE_LOCAL_TZ`       | Whether to use local timezone in logs (`true/false`).                    |

---

### Garage-UI (Web Interface)

| Variable          | Usage                                                             |
| ----------------- | ----------------------------------------------------------------- |
| `ADMIN_TOKEN`     | Token used by the UI to communicate securely with Garage backend. |
| `API_BASE_URL`    | URL of the Garage API service (e.g., `http://garage:3903`).       |
| `S3_ENDPOINT_URL` | URL of the Garage S3 endpoint (e.g., `http://garage:3900`).       |
| `BASE_PATH`       | Base path prefix for the UI routing (default `/garage-ui`).       |

---

### Traefik (Reverse Proxy)

| Variable                 | Usage                                                                    |
| ------------------------ | ------------------------------------------------------------------------ |
| `BASIC_AUTH_CREDENTIALS` | Basic auth credentials for securing the Traefik dashboard (`user:pass`). |
| `HTTPS_PUBLIC_PORT`      | The public HTTPS port to expose (default `8443`).                        |

---

## 🛠 Setup

Before starting the stack, you must run the **setup script**.
This script initializes environment variables, secrets, and required directories.

```bash
./setup.sh
```

---

## 🚀 How to Get Started

1. **Run the setup script**

   ```bash
   ./setup.sh
   ```

2. **Build and launch the stack**

   ```bash
   docker compose build
   docker compose up -d
   ```

3. **Access the services**

| Service       | URL/Path Example                  | Notes                  |
| ------------- | --------------------------------- | ---------------------- |
| **Garage-UI** | `https://<your-domain>/garage-ui` | UI secured via Traefik |
| **S3 API**    | `https://<your-domain>`           | S3-compatible storage  |
| **Traefik**   | `https://<your-domain>/traefik`   | Dashboard 🔒           |

4. **Stop the stack**

   ```bash
   docker compose down
   ```

---

## 📊 Monitoring & Metrics

| Component   | Endpoint   | Protection                    |
| ----------- | ---------- | ----------------------------- |
| **Garage**  | `/metrics` | Requires `METRICS_TOKEN`.     |
| **Traefik** | `/traefik` | Protected with basic auth 🔒. |

Logs can be collected via `docker logs <service>` or centralized monitoring tools.

