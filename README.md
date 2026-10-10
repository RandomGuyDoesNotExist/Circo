# Circo (CircleShare) ⭕
> **System Architecture and Integration (SysInt) Final Project**  
> *Containerized Multi-Service Infrastructure and Automated CI/CD Pipeline using Docker & Jenkins*

---

## 1. Project Overview

**Circo** (CircleShare) is a containerized microservice-based collaborative knowledge-sharing platform. It allows study groups and academic "circles" to share study materials, documents, and code resources, attach contextual notes in discussion threads, and receive real-time notifications via WebSockets whenever new resources are posted.

The platform is engineered with:
- **Zero-Downtime Microservices**: Separated concerns across Authentication, Resource Storage, Real-time WebSockets, and Database layers.
- **Single Gateway Entry Point**: An Nginx reverse proxy guarding all internal microservices and isolating internal database networks from direct public host exposure.
- **Robust Persistence**: Named Docker volumes for PostgreSQL data and file uploads that survive restarts and redeployments.
- **Strict Quality Gates**: Multi-stage Docker builds running automated Jest unit/integration tests that block broken code from ever reaching deployment.
- **Automated CI/CD**: A declarative Jenkins pipeline triggered on Git pushes that tags images by build number and verifies health with smoke testing.

---

## 2. Team Composition & Roles

| Role | Primary Responsibilities | Deliverables Owned |
| :--- | :--- | :--- |
| **Project Lead / Scrum Master** | Plans tasks, manages Git repository, coordinates sprint and presentation demo flow. | Project proposal, task board, demo coordination, repository management. |
| **DevOps / CI-CD Engineer** | Sets up Jenkins in Docker, configures plugins, credentials, webhooks/polling, and writes `Jenkinsfile`. | `infra/jenkins/`, `Jenkinsfile`, webhook & credential configuration. |
| **Infrastructure Engineer** | Designs architecture, writes Dockerfiles & `docker-compose.yml`, configures Nginx reverse proxy, networks, volumes, health checks. | Architecture diagram, `proxy/`, `docker-compose.yml`, container security. |
| **Backend & Database Engineer** | Builds API services, PostgreSQL schema, database seeding, and automated test suites. | `auth-api/`, `resource-api/`, `realtime-service/`, `db/init.sql`, unit tests. |
| **Frontend, QA & Documentation Lead** | Builds user-facing UI, creates smoke tests, manages technical documentation and slide deck. | `frontend/`, smoke tests, technical documentation (PDF), presentation slides. |

---

## 3. Architecture & Container Topology

```text
                                  Browser Client / User
                                            │
                                            ▼
                        ┌───────────────────────────────────────┐
                        │       Reverse Proxy (Nginx :80)       │
                        │           (Host Port: 8080)           │
                        └───────────────────┬───────────────────┘
                                            │
             ┌──────────────────────────────┼──────────────────────────────┐
             │                              │                              │
     Path: / │                 Path: /api/auth/     Path: /api/resources/  │ Path: /socket.io/
             ▼                              ▼                              ▼              ▼
┌─────────────────────────┐    ┌─────────────────────────┐   ┌──────────────────────────┐   ┌─────────────────────────┐
│     frontend (:80)      │    │     auth-api (:4000)    │   │   resource-api (:5000)   │   │ realtime-service (:6000)│
│ Nginx Static Web Client │    │ Node.js / Express / JWT │   │ Node.js / Express / Files│   │   Socket.io WebSockets  │
└─────────────────────────┘    └────────────┬────────────┘   └──────┬────────────┬──────┘   └─────────────────────────┘
                                            │                       │            │ (POST /broadcast)
                                            │                       │            └─────────────────────┘
                                            ▼                       ▼
                                   ┌────────────────────────────────────────┐
                                   │         Database (Postgres 16)         │
                                   │              Port :5432                │
                                   │   [Named Volume: db-data]              │
                                   └────────────────────────────────────────┘

[ Isolated User-Defined Network: circo-net | Persistent Volumes: db-data, upload-data ]
```

### Module Stack Justifications

| Container | Technology | Port (Internal) | Purpose & Justification |
| :--- | :--- | :--- | :--- |
| **proxy** | Nginx 1.27 Alpine | `80` (mapped `8080`) | **Single Entry Point**: Routes traffic cleanly, enables SSL termination, applies body limits (60MB), and isolates internal services from the host. |
| **frontend** | Nginx 1.27 Alpine | `80` | **Web UI**: Displays circle members, resource feeds, notes, and a visible CI/CD build badge (`Build #TAG`). |
| **auth-api** | Node.js 20 / Express | `4000` | **Auth & Identity**: Issues stateless JWT tokens, handles bcrypt hashing, and manages user profiles. |
| **resource-api** | Node.js 20 / Express | `5000` | **Resource & Notes**: Handles multipart uploads (Multer), search, categorization, and triggers realtime notifications. |
| **realtime-service** | Node.js 20 / Socket.io | `6000` | **Event Engine**: WebSockets broadcasting live events across circle rooms without page refreshes. |
| **db** | PostgreSQL 16 Alpine | `5432` | **ACID Relational Storage**: Stores users, resources, and notes with relational constraints, indexed queries, and volume persistence. |
| **jenkins** | Jenkins LTS + Docker CLI | `8080` (mapped `8081`) | **CI/CD Automation**: Deployed separately in `infra/jenkins/` so pipeline redeployments never interrupt Jenkins itself. |

---

## 4. Prerequisites

- **Docker Desktop** (v24+ with WSL 2 on Windows or Docker Engine on Linux)
- **Docker Compose** (v2+)
- **Git** (v2.30+)
- Minimum recommended hardware: 8 GB RAM, 20 GB free disk space.

---

## 5. Quick Start (Local Run)

### Step 1: Environment Setup
Copy the example environment configuration:
```bash
cp .env.example .env
```

### Step 2: Build and Run Application Stack
```bash
docker compose up -d --build
```

### Step 3: Access Application
- **Web UI & Gateway**: Open `http://localhost:8080`
- **Proxy Health**: `http://localhost:8080/proxy-health`
- **Auth Health**: `http://localhost:8080/api/auth/health`
- **Resource Health**: `http://localhost:8080/api/resources/health`

### Step 4: Verify Running Containers
```bash
docker compose ps
```

---

## 6. Jenkins CI/CD Setup

Jenkins runs in an independent container located in `infra/jenkins/`. This guarantees that Jenkins is isolated and cannot redeploy or tear itself down during application builds.

### Step 1: Start Jenkins
```bash
cd infra/jenkins
docker compose up -d --build
cd ../..
```

### Step 2: Retrieve Initial Admin Password
```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### Step 3: Configure Jenkins
1. Open `http://localhost:8081` in your browser.
2. Enter the initial admin password, select **Install Suggested Plugins**, and install the **Docker Pipeline** plugin.
3. Verify Docker access from inside Jenkins:
   ```bash
   docker exec jenkins docker ps
   ```

### Step 4: Add Production Secrets in Jenkins
1. Navigate to **Manage Jenkins** $\rightarrow$ **Credentials** $\rightarrow$ **System** $\rightarrow$ **Global credentials**.
2. Add a new credential of type **Secret file**:
   - **ID**: `circo-env`
   - **File**: Upload your production `.env` file.

### Step 5: Configure Pipeline Job
1. Create **New Item** $\rightarrow$ Name it `circo-pipeline` $\rightarrow$ Select **Pipeline**.
2. Under **Build Triggers**, select **GitHub hook trigger for GITScm polling** or check **Poll SCM** (`H/2 * * * *`).
3. Under **Pipeline Definition**, select **Pipeline script from SCM**:
   - SCM: **Git**
   - Repository URL: Your Git repository URL.
   - Script Path: `Jenkinsfile`
4. Click **Save** and trigger an initial build.

---

## 7. Quality Gates & Testing Strategy

To ensure zero broken releases reach users, all backend microservices use multi-stage Dockerfiles with dedicated `test` stages:

```bash
# Auth API quality gate
docker build --target test -t circo/auth-api:test ./auth-api

# Resource API quality gate
docker build --target test -t circo/resource-api:test ./resource-api

# Realtime Service quality gate
docker build --target test -t circo/realtime-service:test ./realtime-service
```

If any test assertion fails, Docker aborts with a non-zero exit code. Jenkins stops execution at the `Test` stage, preventing image building and deployment.

---

## 8. Live Demonstration Script (7-Step Presentation Flow)

1. **Step 1: Baseline Verification**  
   Open `http://localhost:8080`. Point out `Build: dev` (or current build number). Show running containers with `docker compose ps`.

2. **Step 2: Commit Code Change**  
   Make a visible modification (e.g. edit the brand tagline in `frontend/src/index.html` or change version label). Commit and push to Git:
   ```bash
   git add frontend/src/index.html
   git commit -m "feat: updated branding header for live demo"
   git push origin main
   ```

3. **Step 3: Automated Pipeline Execution**  
   Without clicking "Build Now", show Jenkins automatically picking up the push via Webhook/Poll SCM. Walk through each stage in the **Stage View** (`Checkout` $\rightarrow$ `Test` $\rightarrow$ `Build Images` $\rightarrow$ `Deploy` $\rightarrow$ `Smoke Test`).

4. **Step 4: Live Update in Browser**  
   Refresh `http://localhost:8080`. Point out the updated heading and the incremented build number in the top badge and footer.

5. **Step 5: Quality Gate Proof (Broken Code Rejection)**  
   Push a breaking test assertion into `auth-api/tests/auth.test.js` (e.g., changing expected status code from 200 to 500).  
   Observe Jenkins running the pipeline: the `Test` stage **fails** and halts immediately.  
   Refresh `http://localhost:8080` to demonstrate the application is still online running the previous working version.  
   Revert the breaking commit and let the pipeline turn green again.

6. **Step 6: Data Persistence Proof**  
   Upload a resource and post several notes on `http://localhost:8080`.  
   Tear down and recreate the containers:
   ```bash
   docker compose down
   docker compose up -d
   ```
   Refresh the browser: all uploaded documents, notes, and user accounts remain intact because they reside on the persistent named volume `db-data`.

7. **Step 7: Rollback to Previous Image**  
   Demonstrate rolling back to an earlier tagged release:
   ```bash
   TAG=1 docker compose up -d --no-build
   ```
   Refresh the browser: the page reflects Build #1 instantly.
