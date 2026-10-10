# Appendix A: Project Proposal

## General Project Information

| Item | Details |
| :--- | :--- |
| **Group Name** | Circo Integration Team |
| **Project Title** | Circo (CircleShare) - Collaborative Resource & Knowledge Hub |
| **Short Description** | Circo is a containerized microservice platform designed for academic study groups to share study materials, documents, and reference notes in real time. Built with resilience and zero-downtime scalability in mind, Circo features an Nginx reverse proxy gateway, JWT authentication, persistent storage, and WebSocket notifications. Every commit undergoes automated containerized quality gate testing in Jenkins to ensure flawless continuous deployment. |
| **Repository URL** | https://github.com/your-org/circo *(or classroom Git URL)* |

---

## Group Composition & Roles

| Role | Name | Responsibilities |
| :--- | :--- | :--- |
| **Project Lead / Scrum Master** | Moedillas, Benj Zion G. | Task coordination, Git branch management, integration flow, and final presentation lead. |
| **DevOps / CI-CD Engineer** | Manzon, Avery Mayer D. | Jenkins container configuration, Docker socket integration, pipeline-as-code (`Jenkinsfile`), and webhook triggers. |
| **Infrastructure Engineer** | Waje, Zyrone Dale D. | Dockerfiles, multi-stage optimization, `docker-compose.yml`, Nginx reverse proxy configuration, volumes, and health checks. |
| **Backend & Database Engineer** | Puno, Prince Michael D. | Microservices (`auth-api`, `resource-api`, `realtime-service`), PostgreSQL schema, seed data, and unit test suites. |
| **Frontend, QA & Documentation Lead** | Bailon, Lance Steven C. | Frontend web UI development, version tag visualization, smoke tests, and technical documentation. |

---

## Module & Technology Stack Matrix

| Module / Container | Technology | Purpose | Justification |
| :--- | :--- | :--- | :--- |
| **proxy** | Nginx 1.27 (Alpine) | Reverse proxy & single ingress | Provides a single entry point on port 8080, isolates internal microservices, and enforces client request limits. |
| **frontend** | Nginx 1.27 + Web UI | User interface | Lightweight client delivering real-time feeds, member lists, resource uploads, and a prominent live CI/CD build badge. |
| **auth-api** | Node.js 20 / Express | Authentication service | Handles bcrypt password hashing, stateless JWT issuance, profile updates, and circle roster queries. |
| **resource-api** | Node.js 20 / Express | Resource & note service | Manages document uploads, searches, attachments, and inter-service dispatch to the realtime service. |
| **realtime-service** | Node.js 20 / Socket.io | WebSockets event engine | Broadcasts real-time events across circle rooms without polling overhead. |
| **db** | PostgreSQL 16 (Alpine) | Persistent database | Relational ACID compliance with foreign key constraints and automated volume persistence (`db-data`). |
| **jenkins** | Jenkins LTS + Docker CLI | CI/CD automation server | Runs separately in `infra/jenkins/` to automate build, quality gate testing, image tagging, and deployment. |

---

## CI/CD Pipeline Plan

| Pipeline Phase | Details |
| :--- | :--- |
| **Git Hosting** | GitHub / GitLab / Self-Hosted Gitea |
| **Triggers** | GitHub Webhook (via ngrok) with Poll SCM fallback (`H/2 * * * *`) |
| **Planned Stages** | 1. `Checkout` $\rightarrow$ 2. `Test (Quality Gate)` $\rightarrow$ 3. `Build Images` $\rightarrow$ 4. `Deploy` $\rightarrow$ 5. `Smoke Test` |
| **Automated Tests** | Unit & integration tests in `auth.test.js`, `resource.test.js`, and `realtime.test.js` executed via `docker build --target test`. |
| **Rollback Strategy** | Image tagging by build number (`TAG = BUILD_NUMBER`). Previous builds can be restored immediately using `TAG=<id> docker compose up -d --no-build`. |
| **Bonus Features** | - Live WebSockets broadcasting.<br>- Automatic smoke test verification in pipeline.<br>- Multi-stage Docker optimization with non-root security. |
