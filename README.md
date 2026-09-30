<div align="center">

  <br />
  <a href="https://veri-loan.vercel.app/" target="_blank">
    <img src="docs/images/veriloan_logo.png" alt="VeriLoan Logo" width="130" style="border-radius: 14px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);" />
  </a>
  
  <h1 align="center" style="margin-top: 14px; font-size: 2.6rem; font-weight: 900; letter-spacing: -0.03em;">VeriLoan</h1>
  
  <p align="center">
    <strong>Autonomous Financial Diligence &amp; Cryptographic Verification Platform</strong>
  </p>

  <p align="center">
    <a href="https://veri-loan.vercel.app/" target="_blank">
      <img src="https://img.shields.io/badge/Live_Platform-Vercel_Edge-059669?style=for-the-badge&logo=vercel&logoColor=white" alt="Live App" />
    </a>
    &nbsp;
    <a href="https://veriloan-production-dc36.up.railway.app/docs" target="_blank">
      <img src="https://img.shields.io/badge/Cloud_API-Swagger_Docs-0284C7?style=for-the-badge&logo=fastapi&logoColor=white" alt="Swagger Docs" />
    </a>
    &nbsp;
    <a href="https://github.com/Kr1sh-gupta/VeriLoan" target="_blank">
      <img src="https://img.shields.io/badge/Source_Monorepo-GitHub-4F46E5?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Repo" />
    </a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python 3.11" />
    <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/AI_Engine-Gemini_2.5_Flash-8E75B2?style=flat-square&logo=googlegemini&logoColor=white" alt="Gemini AI" />
    <img src="https://img.shields.io/badge/Security-SHA--256_Vault-0EA5E9?style=flat-square&logo=shield&logoColor=white" alt="SHA-256" />
    <img src="https://img.shields.io/badge/Test_Suite-44%2F44_Passing-10B981?style=flat-square&logo=pytest&logoColor=white" alt="Pytest Tests" />
  </p>

</div>

---

### ⚡ The Platform at a Glance

VeriLoan transforms multi-day manual mortgage tape diligence into a **60-second autonomous, deterministic, and cryptographically verified process**:

```
┌────────────────────────────────┐     ┌────────────────────────────────┐     ┌────────────────────────────────┐
│   1. Multi-Modal Intake Hub    │ ──> │   2. 15-Rule Validation Engine │ ──> │  3. Human-in-the-Loop AI Guard │
│ 1-Click Tapes, Scans, Live API │     │ Mandatory, Formats, Logic, DPD │     │ Root-Cause Diagnosis & Patches │
└────────────────────────────────┘     └────────────────────────────────┘     └────────────────────────────────┘
                                                                                               │
                                                                                               ▼
                                       ┌────────────────────────────────┐     ┌────────────────────────────────┐
                                       │   5. Verified Records & Export │ <── │  4. Cryptographic Proof Vault │
                                       │ Institutional CSV/JSON Manifest│     │ Deterministic SHA-256 Hashes   │
                                       └────────────────────────────────┘     └────────────────────────────────┘
```

---

### 🎯 Key Capabilities

| Capability | What It Delivers |
| :--- | :--- |
| **📥 1-Click Financial Ingestion** | Instant loading of **Fannie/Freddie Standard** (`1,200 loans`), **Multi-Source Delta** (`398 records`), and **Document Manifests** (`1,194 records`) with real-time server stream telemetry. |
| **⚡ Deterministic 15-Rule Engine** | High-performance execution of constraints including mandatory IDs, duplicate combos, ISO-8601 extended date logic (`VAL-106`), balance bounds, DPD reconciliation, and borrower concentration risk. |
| **🤖 Zero-Silent-Write AI Copilot** | Context-aware Google Gemini 2.5 Flash assistant generating explainable anomaly diagnostics and candidate JSON patches with strict human reviewer authorization. |
| **🔐 Cryptographic Proof & Sealing** | Deterministic canonical JSON serialization (`sort_keys=True`) and SHA-256 hash sealing with on-the-fly tamper recalculation and an immutable 7-event audit timeline. |

---

### 🌐 Core REST API Endpoints (Cloud & Local)

The API is fully documented via interactive OpenAPI/Swagger at [`https://veriloan-production-dc36.up.railway.app/docs`](https://veriloan-production-dc36.up.railway.app/docs). Below are the primary endpoints governing diligence workflows:

| Method | Endpoint | Description | Role Clearance |
| :---: | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user credentials & issue scoped JWT bearer token | Public |
| `POST` | `/api/ingest/upload` | Stream-ingest raw loan tape, servicer update, or document manifest CSV | `OPERATOR`, `ADMIN` |
| `GET` | `/api/summary` | Real-time system telemetry, health score, pass rates, and batch metrics | All Roles |
| `GET` | `/api/loans` | Filterable portfolio loan records with pagination and borrower search | All Roles |
| `GET` | `/api/loans/{id}` | Detailed loan record with cross-source servicer updates & document hashes | All Roles |
| `PUT` | `/api/loans/{id}` | Reviewer manual field correction with audit logging and previous-state capture | `REVIEWER`, `ADMIN` |
| `GET` | `/api/exceptions` | Exception triage matrix filtered by severity (`CRITICAL`, `HIGH`), status, or rule | `REVIEWER`, `ADMIN` |
| `POST` | `/api/exceptions/{id}/resolve` | Execute exception resolution (`ACCEPT_AI`, `MANUAL_OVERRIDE`, `DISMISS`, `REJECT`) | `REVIEWER`, `ADMIN` |
| `POST` | `/api/exceptions/{id}/comment` | Add reviewer diligence notes and audit commentary to exception record | `REVIEWER`, `ADMIN` |
| `POST` | `/api/ai/explain` | Dual-engine AI root-cause diagnosis & suggested data patch with confidence score | `REVIEWER`, `ADMIN` |
| `GET` | `/api/verified-loans` | Paginated list of cryptographically sealed records with canonical SHA-256 hashes | All Roles |
| `GET` | `/api/verified-loans/{id}` | Sealed record details with live recalculation of hash and tamper detection | All Roles |
| `POST` | `/api/verified-loans/verify-all-clean` | Batch seal and cryptographically hash all clean loans passing 15 rules | `REVIEWER`, `ADMIN` |
| `GET` | `/api/verified-loans/export/csv` | Download sealed verified records as an institutional compliance CSV manifest | `CONSUMER`, `REVIEWER`, `ADMIN` |
| `GET` | `/api/audit/{loan_id}` | Chronological lifecycle provenance timeline for a specific loan record | All Roles |
| `GET` | `/api/audit` | System-wide append-only audit ledger with actor and state transitions | `ADMIN` |

---

### 👥 Test Personas & Access Credentials

Switch personas instantly using the bottom-left switcher or top-right profile badge:

| Role | Persona Name | Username | Password | Operational Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Data Operator** | Elena Rostova | `operator` | `operator123!` | 1-Click tape ingestion, drag-and-drop intake, batch lineage tracking |
| **Senior Reviewer** | Marcus Vance | `reviewer` | `reviewer123!` | Exception queue triage, Gemini AI patch approval, manual overrides |
| **Data Consumer** | Sarah Chen | `consumer` | `consumer123!` | Verified records portal, SHA-256 hash recalculation, institutional CSV export |
| **System Admin** | Alex Rivera | `admin` | `admin123!` | Live REST API Playground, dynamic 15-rule configuration, system telemetry |

---

### 🚀 Quick Start in 60 Seconds

#### Option 1: Native Local Setup

```bash
# 1. Start Backend Service (FastAPI)
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
# -> API running at http://localhost:8000 (Swagger docs at /docs)

# 2. Start Frontend Application (React 19 + Vite)
cd frontend
npm install
npm run dev
# -> Web app live at http://localhost:5173
```

#### Option 2: Docker Compose

```bash
docker compose up --build
```

---

### 🛠️ Architecture & Tech Stack

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Plus Jakarta Sans & JetBrains Mono typography.
* **Backend**: FastAPI (Python 3.11), SQLAlchemy ORM, SQLite / PostgreSQL, Pydantic v2.
* **AI Engine**: Google Gemini 2.5 Flash API with local heuristic fallback.
* **Security & Diligence**: SHA-256 deterministic hashing, RBAC authentication, 7-event append-only audit trail.
* **Cloud Infrastructure**: Vercel Global Edge (Frontend) + [Railway.app Cloud API](https://veriloan-production-dc36.up.railway.app/docs) (`https://veriloan-production-dc36.up.railway.app`).

---

### 🧪 Automated Test Suite

```bash
cd backend
pytest tests/ -v
# -> 44 / 44 tests passing (100% pass rate in 10.6s)
```

---

<!--
### 👥 Contributors — Team Trustmint

Developed with pride for the **Intain FinTech Challenge 2026** by **Team Trustmint**:

<div align="center">

| [<img src="https://github.com/Kr1sh-gupta.png?size=100" width="100px;" alt="Krish Gupta"/><br /><sub><b>Krish Gupta</b></sub>](https://github.com/Kr1sh-gupta)<br />[![GitHub](https://img.shields.io/badge/GitHub-Kr1sh--gupta-181717?style=flat-square&logo=github)](https://github.com/Kr1sh-gupta)<br /><b> | [<img src="https://github.com/Radha-byte.png?size=100" width="100px;" alt="Radha Rani"/><br /><sub><b>Radha Rani</b></sub>](https://github.com/Radha-byte)<br />[![GitHub](https://img.shields.io/badge/GitHub-Radha--byte-181717?style=flat-square&logo=github)](https://github.com/Radha-byte)<br />| [<img src="https://github.com/pranathi-2504.png?size=100" width="100px;" alt="G V Mani Prabha"/><br /><sub><b>G V Mani Prabha (Pranathi)</b></sub>](https://github.com/pranathi-2504)<br />[![GitHub](https://img.shields.io/badge/GitHub-pranathi--2504-181717?style=flat-square&logo=github)](https://github.com/pranathi-2504)<br />|
| :---: | :---: | :---: |

</div>
-->

---

<div align="center">
  <small>Developed for the Intain FinTech Challenge 2026 • Monorepo Architecture</small>
</div>

