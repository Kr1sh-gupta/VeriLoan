# VeriLoan — Loan Data Verification Copilot

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript-61DAFB.svg?style=flat&logo=react)](https://reactjs.org)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![Security](https://img.shields.io/badge/Cryptography-SHA--256%20Canonical%20Seal-0ea5e9.svg?style=flat)](https://github.com/Kr1sh-gupta/VeriLoan)

A full-stack financial diligence platform that ingests multi-source loan tapes, executes a 14-rule validation engine, assists reviewers via an explainable AI Copilot with human-in-the-loop controls (zero silent writes), and produces cryptographically verified records with SHA-256 hashes and an immutable audit trail.

---

## 🏗️ Architecture & Features

- **Multi-Source Ingestion**: Streaming parser for primary loan tapes, secondary servicer updates, and document manifests with raw schema lineage tracking.
- **14-Rule Validation Engine**: High-performance validation covering balance bounds, date sequence logic, duplicates, rate anomalies, payment status vs. DPD mismatches, document status, and cross-source conflict reconciliation.
- **AI Review Assistant (Copilot)**: Dual-mode engine (Google Gemini API + deterministic local financial heuristic engine for 100% offline resilience) providing root-cause explanations and suggested data patches.
- **Cryptographic Verification**: Deterministic canonical JSON serialization and SHA-256 record hashing with on-the-fly tamper verification.
- **Role-Based Workspaces**: Tailored interfaces for Data Operator (ingestion & batch lineage), Reviewer (exception queue & AI drawer), and Data Consumer (verified records & CSV export).
- **REST API Suite**: Complete REST endpoints with automated Swagger OpenAPI documentation.

---

## 🚀 Running Locally (Native Setup)

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** and **npm**

---

### Step 1: Start the Backend Service

Open a terminal and run:

```bash
# Navigate to the backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# (Optional) Run test suite to verify installation
python -m pytest tests/ -v

# Start the FastAPI server
python -m uvicorn app.main:app --reload --port 8000
```

- **Backend API**: `http://localhost:8000`
- **Swagger Interactive API Docs**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

---

### Step 2: Start the Frontend Application

Open a second terminal and run:

```bash
# Navigate to the frontend directory
cd frontend

# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```

- **Frontend Application**: `http://localhost:5173`

---

## 🐳 Running with Docker & Docker Compose

To spin up both the backend and frontend in isolated containers:

### 1. Build and Start Services
```bash
# From the project root (where docker-compose.yml is located)
docker compose up --build
```

### 2. Access the Applications
- **Frontend UI**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **Swagger API Docs**: `http://localhost:8000/docs`

### 3. Stop Services
```bash
docker compose down
```

---

## 🔑 Pre-Configured Test Personas

You can switch between test accounts using the persona selector in the top navigation bar:

| Role | Persona Name | Username | Password | Permissions |
|---|---|---|---|---|
| **Data Operator** | Elena Rostova | `operator` | `operator123!` | CSV upload, schema inspection, batch verification |
| **Reviewer** | Marcus Vance | `reviewer` | `reviewer123!` | Exception queue, AI copilot, patch approval / edit |
| **Data Consumer** | Sarah Chen | `consumer` | `consumer123!` | Verified records, SHA-256 hash validation, audit history, CSV export |

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/summary` | Real-time system health, exception counts, and quality metrics |
| `GET` | `/api/loans` | Paginated raw and normalized loan records with filters |
| `GET` | `/api/loans/:id` | Detailed loan record with cross-source references |
| `PUT` | `/api/loans/:id` | Manual field adjustment with audit trail logging |
| `GET` | `/api/exceptions` | Filterable exception queue with AI recommendations |
| `POST` | `/api/exceptions/:id/resolve` | Resolve exception (`ACCEPT_AI`, `MANUAL_EDIT`, `DISMISS`, `REJECT`) |
| `POST` | `/api/ai/explain` | Generate AI root-cause explanation and suggested patch |
| `GET` | `/api/verified-loans` | Paginated verified records with SHA-256 hashes |
| `GET` | `/api/verified-loans/:id` | Verified record with live SHA-256 tamper recalculation |
| `POST` | `/api/verified-loans/verify-all-clean` | Batch seal all clean loans that passed validation |
| `GET` | `/api/verified-loans/export/csv` | Download canonical verified dataset in CSV format |
| `GET` | `/api/audit/:loanId` | Immutable chronological event history for a loan |

---

## ⚙️ Environment Variables

Create a `.env` file in `backend/` if you wish to configure optional settings:

```env
# Database connection string (defaults to SQLite: sqlite:///./copilot.db)
DATABASE_URL=sqlite:///./copilot.db

# Optional Google Gemini API Key for live LLM inference (fallback heuristic is used if omitted)
GEMINI_API_KEY=your_gemini_api_key_here

# Backend host and port
HOST=0.0.0.0
PORT=8000
```

---

## 📂 Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/             # REST route handlers (auth, loans, exceptions, ai, audit)
│   │   ├── services/        # Business logic (validation, verification, AI, ingestion)
│   │   ├── config.py        # Settings & environment variables
│   │   ├── database.py      # SQLAlchemy database session setup
│   │   ├── models.py        # SQLAlchemy ORM database models
│   │   ├── schemas.py       # Pydantic data validation schemas
│   │   └── main.py          # FastAPI application entrypoint & startup seeder
│   ├── tests/               # Pytest unit and integration test suite
│   ├── Dockerfile           # Backend container build specification
│   └── requirements.txt     # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components (Hero, Operator, Reviewer, Consumer, API)
│   │   ├── lib/             # Axios API client
│   │   ├── types/           # TypeScript interfaces
│   │   ├── App.tsx          # Main application router and state
│   │   └── main.tsx         # React root entrypoint
│   ├── Dockerfile           # Frontend container build specification
│   └── package.json         # Node.js dependencies
│
├── data/                    # Synthetic seed datasets & validation rules
├── docker-compose.yml       # Multi-container orchestration configuration
└── README.md                # Project documentation
```

---

## 🧪 Testing

Run backend test suite:
```bash
cd backend
python -m pytest tests/ -v
```

Run frontend production build verification:
```bash
cd frontend
npm run build
```
