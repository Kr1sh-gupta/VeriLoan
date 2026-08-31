<div align="center">

  <h1>VeriLoan</h1>
  <p><strong>AI-Assisted Financial Diligence & Cryptographic Verification Platform</strong></p>

  <p align="center">
    <a href="https://veri-loan.vercel.app/" target="_blank">
      <img src="https://img.shields.io/badge/Live_Web_App-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel Deployment" />
    </a>
    <a href="https://veriloan-production-5628.up.railway.app/docs" target="_blank">
      <img src="https://img.shields.io/badge/REST_API_Docs-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="Swagger API Docs" />
    </a>
    <a href="https://github.com/Kr1sh-gupta/VeriLoan" target="_blank">
      <img src="https://img.shields.io/badge/Monorepo-GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Repo" />
    </a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/FastAPI-Python_3.11-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/React_19-TypeScript-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
    <img src="https://img.shields.io/badge/Gemini_2.5_Flash-8E75B2?style=flat-square&logo=googlegemini&logoColor=white" alt="Gemini AI" />
    <img src="https://img.shields.io/badge/SHA--256-Sealed-0ea5e9?style=flat-square&logo=lock&logoColor=white" alt="SHA-256" />
    <img src="https://img.shields.io/badge/Tests-43%2F43_Passing-10B981?style=flat-square&logo=pytest&logoColor=white" alt="Pytest Passing" />
  </p>

</div>

---

## 📌 Overview

**VeriLoan** is an institutional financial diligence engine for secondary mortgage markets. It automates portfolio tape intake, executes deterministic financial constraint validation, assists analysts via an explainable AI Copilot, and seals clean records with cryptographic SHA-256 hashes.

### Key Highlights
* **Multi-Modal Intake**: 1-click preloaded financial datasets (`loan_tape.csv`, `servicer_update.csv`, `document_manifest.csv`), drag-and-drop custom tapes, and OCR simulators.
* **15-Rule Validation Engine**: Real-time deterministic validation covering mandatory IDs, duplicate detection, ISO-8601 dates, balance bounds, DPD consistency, servicer reconciliation, and borrower concentration.
* **Zero-Silent-Write AI Copilot**: Context-aware Google Gemini assistant suggesting root-cause explanations and candidate patches with 100% human reviewer oversight.
* **Cryptographic Proof Vault**: Deterministic canonical JSON serialization (`sort_keys=True`) and SHA-256 hash sealing with an immutable 7-event audit trail.

---

## 📊 Presentation Deck

An interactive 8-slide slide deck is included in the repository:
* **File**: [`docs/presentation.html`](docs/presentation.html)
* **How to Open**: Double-click `docs/presentation.html` in your browser. Supports fullscreen (`F`) and arrow key navigation (`←` / `→`).

---

## ⚡ Quick Start

### Option 1: Local Development

```bash
# 1. Backend (FastAPI)
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
# API running at http://localhost:8000 (Swagger docs at /docs)

# 2. Frontend (React + Vite) — in a new terminal
cd frontend
npm install
npm run dev
# Web app running at http://localhost:5173
```

### Option 2: Docker Compose

```bash
docker compose up --build
```

---

## 🔑 Pre-Configured Test Accounts

| Role | Username | Password | Access & Responsibilities |
| :--- | :--- | :--- | :--- |
| **Data Operator** | `operator` | `operator123!` | Portfolio intake, 1-click datasets, batch lineage |
| **Senior Reviewer** | `reviewer` | `reviewer123!` | Exception queue, AI patch approval, custom overrides |
| **Data Consumer** | `consumer` | `consumer123!` | Verified records portal, SHA-256 tamper checks, CSV export |
| **System Admin** | `admin` | `admin123!` | Dynamic 15-rule configuration, REST API explorer |

---

## 🛠️ Tech Stack

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Plus Jakarta Sans & JetBrains Mono fonts.
* **Backend**: FastAPI (Python 3.11), SQLAlchemy ORM, SQLite / PostgreSQL, Pydantic v2.
* **AI Intelligence**: Google Gemini 2.5 Flash API with local heuristic fallback.
* **Security & Diligence**: SHA-256 deterministic hashing, RBAC authentication, 7-event append-only audit trail.
* **Cloud Deployments**: Vercel Global Edge (Frontend) + Railway.app (Cloud API).

---

## 🧪 Testing & Quality Assurance

```bash
cd backend
pytest tests/ -v
# 43 / 43 tests passing (100% pass rate)
```

---

## 📜 Monorepo Layout

```
.
├── backend/          # FastAPI REST API service & database models
├── frontend/         # React 19 + Vite web application
├── main/             # Monorepo root, CI/CD workflows, and documentation
│   ├── docs/         # Presentation deck (presentation.html), architecture & logs
│   └── README.md     # Project overview & quickstart
└── docker-compose.yml
```
