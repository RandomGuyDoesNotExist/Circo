# Circo Final Presentation Slides Outline
> **SysInt Final Project Presentation (10 Minutes + 5 Minutes Q&A)**  
> *Target: 14 Slides (All 5 group members speak)*

---

### Slide 1: Title Slide (Presenter: Project Lead)
- **Project**: Circo (CircleShare) - Collaborative Resource Hub
- **Course**: System Architecture and Integration (SysInt)
- **Team Members & Assigned Roles**

### Slide 2: Problem Statement & Motivation (Presenter: Frontend Lead)
- Need for collaborative note and file sharing in student study circles.
- Importance of high availability, real-time sync, and rapid bug-free deployment.

### Slide 3: System Architecture Overview (Presenter: Infrastructure Engineer)
- Diagram showing Nginx Reverse Proxy (:8080), Frontend (:80), Auth API (:4000), Resource API (:5000), Realtime Service (:6000), and Postgres (:5432).
- Traffic routing and network isolation (single public port vs internal `circo-net`).

### Slide 4: Data Architecture & Persistence (Presenter: Backend & DB Engineer)
- PostgreSQL schema: `users`, `resources`, `notes`, `activity_log`.
- Docker named volumes (`db-data` and `upload-data`): How data survives container teardown.

### Slide 5: Microservice Implementation (Presenter: Backend & DB Engineer)
- Auth API (stateless JWT, bcrypt password hashing).
- Resource API (file handling, note discussions).
- Realtime Service (Socket.io event streaming).

### Slide 6: Container Security & Best Practices (Presenter: Infrastructure Engineer)
- Pinned alpine base images (`postgres:16-alpine`, `nginx:1.27-alpine`, `node:20-alpine`).
- Non-root user execution (`USER node`).
- `.dockerignore` optimization and layer caching.

### Slide 7: CI/CD Pipeline Architecture (Presenter: DevOps / CI-CD Engineer)
- Dedicated Jenkins in Docker architecture (`infra/jenkins/`).
- Pipeline as Code: Declarative `Jenkinsfile`.
- Automated webhook triggers (GitHub via ngrok / Poll SCM).

### Slide 8: The 5 Pipeline Stages (Presenter: DevOps / CI-CD Engineer)
1. **Checkout**: Pulling repository state.
2. **Test (Quality Gate)**: Running multi-stage Docker tests.
3. **Build Images**: Tagging images with `${BUILD_NUMBER}`.
4. **Deploy**: Zero-downtime container swap.
5. **Smoke Test**: Probing `/health` endpoints through the proxy.

### Slide 9: Quality Gate Mechanism (Presenter: Frontend / QA Lead)
- Why tests run inside Docker (`docker build --target test`).
- Demonstration of broken code blocking deployment: preventing regressions from reaching users.

### Slide 10: Live Demonstration (All Members Co-present)
- Follow the 7-step presentation script:
  1. Show running app in browser with current build tag.
  2. Push code change to GitHub.
  3. Jenkins pipeline executes automatically.
  4. Refresh browser showing live update and incremented build tag.
  5. Push a broken test commit -> Quality gate failure proof.
  6. Show data persistence across `docker compose down` and `docker compose up`.
  7. Show instant rollback using `TAG=<previous>`.

### Slide 11: Challenges Encountered & Solutions (Presenter: Infrastructure / DevOps)
- Mounting Docker socket inside containerized Jenkins (`/var/run/docker.sock`).
- Inter-container network resolution and health check dependencies.
- Synchronizing file uploads with persistent volumes.

### Slide 12: Production Readiness vs Classroom Trade-offs (Presenter: DevOps Engineer)
- Security discussion: Docker socket mount vs rootless Docker / Kubernetes / Kaniko agents.
- Secrets handling via Jenkins Credentials.

### Slide 13: Summary & Learning Outcomes (Presenter: Project Lead)
- Achievement of containerized microservices, automated testing, continuous deployment, and rollback.

### Slide 14: Q&A Slide
- Open floor for individual technical defense (15% individual grade).
