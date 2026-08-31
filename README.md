<div align="center">

  <br />
  <a href="https://veri-loan.vercel.app/" target="_blank">
    <img src="docs/images/favicon.svg" alt="VeriLoan Icon" width="64" height="64" />
  </a>
  
  <h1 align="center" style="margin-top: 10px; font-size: 2.6rem; font-weight: 900; letter-spacing: -0.03em;">VeriLoan</h1>
  
  <p align="center">
    <strong>Autonomous Financial Diligence &amp; Cryptographic Verification Platform</strong>
  </p>

  <p align="center">
    <a href="https://veri-loan.vercel.app/" target="_blank">
      <img src="https://img.shields.io/badge/⚡_Live_Platform-Vercel_Edge-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live App" />
    </a>
    &nbsp;
    <a href="https://veriloan-production-5628.up.railway.app/docs" target="_blank">
      <img src="https://img.shields.io/badge/📜_Swagger_Docs-FastAPI_Cloud-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="Swagger Docs" />
    </a>
    &nbsp;
    <a href="https://github.com/Kr1sh-gupta/VeriLoan" target="_blank">
      <img src="https://img.shields.io/badge/📦_Monorepo-GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Repo" />
    </a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Backend-FastAPI_%7C_Python_3.11-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Frontend-React_19_%7C_Vite-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/Styling-Tailwind_CSS_v4-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/AI_Engine-Gemini_2.5_Flash-8E75B2?style=flat-square&logo=googlegemini&logoColor=white" alt="Gemini AI" />
    <img src="https://img.shields.io/badge/Hashing-SHA--256_Immutable-0ea5e9?style=flat-square&logo=lock&logoColor=white" alt="SHA-256" />
    <img src="https://img.shields.io/badge/Test_Suite-43%2F43_Passed_(100%25)-10B981?style=flat-square&logo=pytest&logoColor=white" alt="Pytest Tests" />
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
* **Cloud Infrastructure**: Vercel Global Edge (Frontend) + Railway.app (Cloud API).

---

### 🧪 Automated Test Suite

```bash
cd backend
pytest tests/ -v
# -> 43 / 43 tests passing (100% pass rate in 10.6s)
```

---

<div align="center">
  <small>Developed for the Intain FinTech Challenge 2026 • Monorepo Architecture</small>
</div>
