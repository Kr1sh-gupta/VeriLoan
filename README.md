# Loan Data Verification Copilot
**Intain Campus FinTech Challenge 2026 | Full Stack Track**

[![Full-Stack Verification](https://img.shields.io/badge/Validation-14%20Rules%20Passing-emerald)](https://github.com/Kr1sh-gupta/intain)
[![Cryptographic Protocol](https://img.shields.io/badge/Security-SHA--256%20Canonical%20Seal-cyan)](https://github.com/Kr1sh-gupta/intain)
[![AI Copilot](https://img.shields.io/badge/AI%20Assistant-Gemini%20%2B%20Deterministic%20Fallback-indigo)](https://github.com/Kr1sh-gupta/intain)

> Build an AI-assisted full-stack console that turns messy loan records into validated, traceable, trusted data.

---

## 🌟 Executive Summary

The **Loan Data Verification Copilot** automates financial loan tape diligence. It ingests messy multi-source loan tapes, detects data anomalies via a 14-rule validation engine, assists reviewers via an explainable AI Copilot with transparent human-in-the-loop governance (zero silent writes), and produces cryptographically verified records with SHA-256 hashes and an immutable audit trail.

---

## 📑 Core Modules Implemented

- **Module A: Data Ingestion & Normalization**: CSV streamer for primary loan tapes (1,200 records), secondary servicer updates, and document manifests with raw lineage preservation.
- **Module B: 14-Rule Validation Engine**: Automated checks across mandatory fields, duplicates, ISO date formats, sequence logic, balance-to-principal constraints, interest rate bounds, payment status vs. DPD consistency, document availability, cross-source servicer conflicts, and stale records.
- **Module C: Exception Queue & Reviewer Workbench**: Filterable exception matrix with severity categorization (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and side-by-side tape-to-servicer diffing.
- **Module D: AI Review Assistant (Copilot)**: Root-cause explanations, suggested data patches, transparent prompts, model metadata, and strict human controls (`[Accept AI Patch]`, `[Custom Edit]`, `[Dismiss Flag]`).
- **Module E: Verified Loan Records**: Canonical JSON serialization with SHA-256 cryptographic hashing and live tamper detection.
- **Module F: Immutable Audit Trail**: Complete event history from raw ingestion to verified export.
- **Module G: Role-Based Dashboards**: Tailored interfaces for **Data Operator**, **Reviewer**, and **Data Consumer**.
- **Module H: Verified Records API**: Complete REST API suite with automated Swagger OpenAPI documentation.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- (Optional) Docker & Docker Compose

### 1. Backend Setup & Startup
```bash
# From workspace root
cd backend

# Install dependencies
pip install -r requirements.txt

# Run automated tests
python -m pytest tests/ -v

# Start FastAPI server on port 8000
python -m uvicorn app.main:app --reload --port 8000
```
Backend API will be live at `http://localhost:8000`.
Swagger interactive documentation: `http://localhost:8000/docs`.

### 2. Frontend Setup & Startup
```bash
# In a new terminal from workspace root
cd frontend

# Install dependencies
npm install

# Start Vite React dev server
npm run dev
```
Web console will be live at `http://localhost:5173`.

---

## 🔑 Pre-Configured Test Credentials

| Role | Persona Name | Username | Password | Access Level |
|---|---|---|---|---|
| **Data Operator** | Elena Rostova | `operator` | `operator123!` | CSV Ingestion, Raw Data, Batch Verification |
| **Reviewer** | Marcus Vance | `reviewer` | `reviewer123!` | Exception Queue, AI Copilot, Patch Resolution |
| **Data Consumer** | Sarah Chen | `consumer` | `consumer123!` | Verified Records, Hash Verification, Audit Trail, CSV Export |

*Note: You can instantly switch between test personas using the top navigation switcher.*

---

## 📦 Key Deliverables & Documentation

- 📄 **[Architecture Note (docs/ARCHITECTURE.md)](docs/ARCHITECTURE.md)**: 2-page detailed system design, data model, validation rules, AI controls, and architectural trade-offs.
- 🤖 **[AI Development Log (docs/AI_DEVELOPMENT_LOG.md)](docs/AI_DEVELOPMENT_LOG.md)**: Required agentic coding demonstration, prompt traces, human review process, rejected outputs, and metrics.
- 🎬 **[Five-Minute Demo Script (docs/DEMO_SCRIPT.md)](docs/DEMO_SCRIPT.md)**: Step-by-step 5-minute evaluation walkthrough for judges.
- 📊 **[Synthetic Datasets (data/)](data/)**: Complete package containing `loan_tape.csv` (1,200 records), `servicer_update.csv`, `document_manifest.csv`, `validation_rules.json`, `users.json`, and `expected_exception_sample.csv`.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti, Axios, Vite.
- **Backend**: Python 3.11, FastAPI, SQLAlchemy ORM, Pydantic, Uvicorn, Pytest.
- **Database**: SQLite (local) / PostgreSQL-ready.
- **AI / LLM Integration**: Google Gemini API (`gemini-1.5-flash`) + High-Precision Deterministic Financial Heuristic Engine for 100% offline demo resilience.
- **Cryptography**: Python `hashlib.sha256` with canonical JSON serialization.

---

## 🏆 Alignment with Judging Criteria

| Criteria | Max Points | Implementation in Loan Data Verification Copilot |
|---|---|---|
| **Full-Stack Product Completeness** | 20 | Complete working frontend & backend, CSV ingestion, SQLite persistence, and end-to-end verified lifecycle. |
| **Backend Architecture & Data Modeling** | 15 | Clean SQLAlchemy models, modular services, 14-rule validation engine, and RESTful APIs. |
| **Frontend Workflow & UX** | 15 | Cyber-FinTech dark theme, dynamic 3-stage animated hero, role-based workflows, and responsive layouts. |
| **AI Feature Quality** | 15 | Explainable AI Copilot, transparent prompt/model metadata, and strict human approval controls (zero silent writes). |
| **Agentic Coding Demonstration** | 15 | Complete `AI_DEVELOPMENT_LOG.md` with prompt traces, human reviews, rejected AI code examples, and metrics. |
| **Traceability & Auditability** | 10 | SHA-256 canonical record hashes, live tamper detection, and immutable chronological audit trail. |
| **Demo Quality** | 10 | Step-by-step 5-minute demo script, pre-seeded datasets, and turnkey local / Docker startup. |

---

© 2026 Intain Campus FinTech Challenge | Loan Data Verification Copilot
