<div align="center">

  <br />
  <img src="https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png" alt="FastAPI" width="180" />
  
  <h1 align="center" style="margin-top: 10px; font-size: 2.2rem; font-weight: 800;">VeriLoan Backend API Service</h1>
  
  <p align="center">
    <strong>Deterministic 15-Rule Financial Validation Engine, AI Diligence Copilot &amp; SHA-256 Proof Vault</strong>
  </p>

  <p align="center">
    <a href="https://veriloan-production-5628.up.railway.app/docs" target="_blank">
      <img src="https://img.shields.io/badge/Live_API_Docs-FastAPI_Swagger-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="Live Swagger Docs" />
    </a>
    &nbsp;
    <a href="https://veri-loan.vercel.app/" target="_blank">
      <img src="https://img.shields.io/badge/Web_Client-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel App" />
    </a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python 3.11" />
    <img src="https://img.shields.io/badge/Framework-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/ORM-SQLAlchemy_2.0-D71F00?style=flat-square&logo=sqlalchemy&logoColor=white" alt="SQLAlchemy" />
    <img src="https://img.shields.io/badge/Validation-Pydantic_v2-E92063?style=flat-square&logo=pydantic&logoColor=white" alt="Pydantic v2" />
    <img src="https://img.shields.io/badge/AI-Google_Gemini_2.5_Flash-8E75B2?style=flat-square&logo=googlegemini&logoColor=white" alt="Gemini AI" />
    <img src="https://img.shields.io/badge/Security-SHA--256_Immutable-0ea5e9?style=flat-square&logo=lock&logoColor=white" alt="SHA-256" />
    <img src="https://img.shields.io/badge/Tests-43%2F43_Passing-10B981?style=flat-square&logo=pytest&logoColor=white" alt="Pytest" />
  </p>

</div>

---

## 📌 Architecture Overview

The **VeriLoan Backend** is an asynchronous high-throughput REST API service developed in Python 3.11 and FastAPI. It serves as the core financial diligence engine for mortgage loan tape intake, multi-source reconciliation, deterministic validation rule execution, AI anomaly remediation, and cryptographic sealing.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FASTAPI REST LAYER                                  │
│         /api/auth  •  /api/ingest  •  /api/loans  •  /api/ai  •  /api/verify          │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
       ┌───────────────────────────────────┼───────────────────────────────────┐
       ▼                                   ▼                                   ▼
┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────────────┐
│  15-Rule Validation  │        │  AI Diligence Engine │        │ Cryptographic Vault  │
│  Mandatory IDs,      │        │  Google Gemini 2.5   │        │ Canonical JSON       │
│  ISO-8601 Dates,     │        │  Flash + Zero-Silent │        │ sort_keys=True       │
│  DPD Reconciliation  │        │  Write Governance    │        │ SHA-256 Sealing      │
└──────────┬───────────┘        └──────────┬───────────┘        └──────────┬───────────┘
           │                               │                               │
           └───────────────────────────────┼───────────────────────────────┘
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        SQLAlchemy ORM & 7-Event Audit Ledger                           │
│  Loans • Batches • Exceptions • VerifiedRecords • AuditEvents • ValidationRulesConfig │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Key Capabilities

### 1. 📥 Multi-Modal Financial Intake
* **1-Click Preloaded Datasets**: Fannie/Freddie Standard (`1,200 loans`), Multi-Source Delta (`398 records`), and Document Custodial Manifest (`1,194 records`).
* **Streaming Intake Telemetry**: Real-time server-sent progress and automated column header mapping.

### 2. 🛡️ Deterministic 15-Rule Validation Engine
Enforces financial data integrity according to strict mortgage diligence standards:
* **`VAL-001`**: Mandatory Identifiers (`loan_id`, `borrower_name`).
* **`VAL-002`**: Duplicate Detection (`loan_id` + `origination_date` composite uniqueness).
* **`VAL-003`**: Property State 2-Letter Code Validation.
* **`VAL-004`**: Non-Negative Principal Balance Bounds.
* **`VAL-005`**: Interest Rate Boundary Checks (`0% - 25%`).
* **`VAL-006`**: Maturity Date vs. Origination Date Chronology.
* **`VAL-007`**: Current Balance cannot exceed Original Principal.
* **`VAL-008`**: Days Past Due (DPD) vs. Performance Status Consistency.
* **`VAL-009`**: LTV (Loan-to-Value) Threshold Warning (`> 100%`).
* **`VAL-010`**: DTI (Debt-to-Income) Ratio Cap (`> 50%`).
* **`VAL-011`**: Servicer Balance & DPD Reconciliation.
* **`VAL-012`**: Mandatory Custodial Document Verification (Note, Deed, Title).
* **`VAL-013`**: Credit Score Range Bounds (`300 - 850`).
* **`VAL-014`**: Property Valuation Recency Check (`<= 12 months`).
* **`VAL-015`**: Single-Borrower Portfolio Concentration Warning (`> 2%`).
* **`VAL-106`**: Extended ISO-8601 Date Parsing (`YYYY-MM-DD`).

### 3. 🤖 Zero-Silent-Write AI Copilot
* Powered by **Google Gemini 2.5 Flash** with offline deterministic heuristic fallbacks.
* Generates plain-English root-cause diagnoses, multi-source diffs, and candidate JSON patches.
* **Strict Diligence Rule**: AI *never* modifies financial state autonomously. All patch applications require explicit human reviewer authorization (`[Accept AI Patch]`, `[Custom Edit]`, `[Reject]`).

### 4. 🔏 Cryptographic SHA-256 Proof Vault
* **Deterministic Canonical Serialization**: Serializes verified record dictionaries with `sort_keys=True, separators=(',', ':')` for mathematical reproducibility.
* **Tamper Verification**: Independently recalculates and verifies record hashes on-the-fly.
* **Immutable 7-Event Audit Trail**: Logs every lifecycle state transition:
  1. `FILE_UPLOADED`
  2. `VALIDATION_RUN`
  3. `AI_SUGGESTION_GENERATED`
  4. `AI_PATCH_APPLIED`
  5. `MANUAL_OVERRIDE`
  6. `RECORD_APPROVED` / `RECORD_REJECTED`
  7. `VERIFIED_RECORD_SEALED`

---

## 🚀 Quick Start Guide

### Prerequisites
* Python 3.11+
* pip

### 1. Installation
```bash
# Navigate to backend directory
cd backend

# Create & activate virtual environment (optional but recommended)
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration
Create a `.env` file in the `backend/` directory (or use default development fallback):
```env
PORT=8000
HOST=0.0.0.0
CORS_ORIGINS=["*"]
DATABASE_URL=sqlite:///./copilot.db
GEMINI_API_KEY=your_gemini_api_key_here  # Optional: local heuristic fallback active if omitted
SECRET_KEY=veriloan_jwt_secret_production_key_2026
ALGORITHM=HS256
```

### 3. Run the Development Server
```bash
python -m uvicorn app.main:app --reload --port 8000
```
* **API Endpoint**: `http://localhost:8000`
* **Swagger UI Docs**: `http://localhost:8000/docs`
* **ReDoc Docs**: `http://localhost:8000/redoc`

---

## 🔑 Default Test Accounts (RBAC)

| Role | Username | Password | Operational Capabilities |
| :--- | :--- | :--- | :--- |
| **Data Operator** | `operator` | `operator123!` | Ingestion Hub, 1-click dataset loading, batch lineage |
| **Senior Reviewer** | `reviewer` | `reviewer123!` | Exception queue triage, Gemini AI patch approval, overrides |
| **Data Consumer** | `consumer` | `consumer123!` | Verified records vault, SHA-256 tamper checks, CSV export |
| **System Admin** | `admin` | `admin123!` | Dynamic 15-rule engine, system telemetry, API explorer |

---

## 🧪 Running the Test Suite

The backend contains a 43-test automated test suite covering authentication, validation rules, AI remediation, audit logs, and cryptographic hash verification:

```bash
pytest tests/ -v
```

### Test Coverage Highlights:
* `tests/test_auth.py`: JWT generation, role checks, password hashing.
* `tests/test_validation.py`: Deterministic testing of rules `VAL-001` through `VAL-015` and `VAL-106`.
* `tests/test_ai_governance.py`: Zero-silent-write enforcement, candidate patch generation.
* `tests/test_crypto_audit.py`: Canonical JSON ordering, SHA-256 sealing, 7 audit event types.

---

## 📂 Project Directory Structure

```
backend/
├── app/
│   ├── api/                  # FastAPI router endpoints
│   │   ├── admin.py          # Rule builder & system telemetry
│   │   ├── ai.py             # AI Copilot & root-cause explanations
│   │   ├── audit.py          # 7-event append-only audit trail
│   │   ├── auth.py           # JWT login & RBAC permissions
│   │   ├── export.py         # Institutional CSV download
│   │   ├── ingest.py         # Tape intake & progress streaming
│   │   ├── loans.py          # Loan records & exception queue
│   │   └── verify.py         # SHA-256 seal & tamper verification
│   ├── services/             # Core business logic
│   │   ├── ai.py             # Google Gemini 2.5 integration
│   │   ├── audit.py          # Immutable audit logging
│   │   ├── crypto.py         # Canonical JSON & SHA-256 hashing
│   │   └── validation.py     # 15 deterministic constraint rules
│   ├── config.py             # Global settings & environment vars
│   ├── db.py                 # SQLAlchemy engine & session factory
│   ├── main.py               # Application factory & CORS middleware
│   ├── models.py             # SQLAlchemy ORM database models
│   └── schemas.py            # Pydantic v2 validation schemas
├── data/                     # Preloaded financial datasets & rules
│   ├── document_manifest.csv # 1,194 custodial documents
│   ├── loan_tape.csv         # 1,200 standard portfolio loans
│   ├── servicer_update.csv   # 398 multi-source delta updates
│   └── validation_rules.json # Dynamic 15-rule configuration
├── tests/                    # Automated Pytest suite (43/43 tests)
├── Dockerfile                # Production Docker container (Railway / Cloud)
├── requirements.txt          # Python package dependencies
└── README.md                 # Backend documentation
```

---

<div align="center">
  <small>VeriLoan Backend • Team Trustmint • Intain FinTech Challenge 2026</small>
</div>
