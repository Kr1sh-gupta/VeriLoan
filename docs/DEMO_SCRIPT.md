# Five-Minute Demo Script & Walkthrough Guide
**Intain Campus FinTech Challenge 2026 | Full Stack Track**

---

## Pre-Demo Checklist (30 Seconds Before Demo)

1. **Start Backend**:
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --port 8000
   ```
2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
3. Open browser to **`http://localhost:5173`**.

---

## 5-Minute Evaluation Flow (Step-by-Step)

### Minute 1: Landing Page & Animated Architecture (0:00 – 1:00)
- **Action**: Open the landing page (`http://localhost:5173`).
- **Showcase**:
  - The dynamic 3-stage animated **Verification Core** visual showing raw messy data entering, AI Copilot neural evaluation, and cryptographic SHA-256 seal output.
  - Live system telemetry cards showing total loans (1,200), exceptions detected, verified records, and overall **Data Quality Score**.
  - Role switcher in top navigation displaying pre-seeded test personas:
    - **Data Operator**: Elena Rostova (`operator` / `operator123!`)
    - **Reviewer**: Marcus Vance (`reviewer` / `reviewer123!`)
    - **Data Consumer**: Sarah Chen (`consumer` / `consumer123!`)

---

### Minute 2: Data Operator Ingestion & Validation (1:00 – 2:00)
- **Action**: Switch to **Data Operator** persona / click **Operator Hub**.
- **Showcase**:
  - Drag-and-drop CSV ingestion zone supporting `loan_tape.csv`, `servicer_update.csv`, and `document_manifest.csv`.
  - Ingestion batch history table showing batch IDs, total rows (1,200), exceptions raised, and execution status.
  - Raw loan records table showing status badges (`FLAGGED`, `PENDING`, `VERIFIED`).
  - Click **"Batch Seal Clean Loans"** to instantly verify all records that passed 14 validation rules without exceptions.

---

### Minute 3: Reviewer Workbench & AI Copilot (2:00 – 3:30)
- **Action**: Switch to **Reviewer** persona / click **Reviewer Workbench**.
- **Showcase**:
  - Interactive **Exception Queue** with instant filtering by Severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and Search.
  - Click on a critical exception (e.g., `VAL-007` Balance Exceeds Principal or `VAL-011` Servicer Conflict).
  - Open the slide-over **AI Review Assistant Panel**:
    - AI root-cause explanation explaining the exact discrepancy.
    - Side-by-side comparison showing tape balance vs. secondary servicer update ledger.
    - Confidence meter (e.g., 96% confidence) and transparent AI model/prompt metadata.
  - Demonstrate **Human-in-the-Loop Governance**:
    - Click **"Accept AI Patch"** (or click **"Custom Edit"** to adjust manual fields).
    - Watch the exception resolve, loan status transition to `VERIFIED`, and confetti celebration trigger!
    - Note that AI never silently altered data without explicit reviewer approval.

---

### Minute 4: Data Consumer & Cryptographic Verification (3:30 – 4:30)
- **Action**: Switch to **Data Consumer** persona / click **Verified Explorer**.
- **Showcase**:
  - The **Sealed Canonical Records Grid** containing all verified loans with their SHA-256 hashes.
  - Click **"Verify Hash"** on any loan:
    - Modal recalculates `SHA256(canonical_json(record))` in real-time and confirms 100% cryptographic match.
  - Click **"Audit Lineage"**:
    - Displays immutable chronological event timeline (`FILE_UPLOADED` -> `VALIDATION_RUN` -> `AI_SUGGESTION_GENERATED` -> `RECORD_APPROVED` -> `VERIFIED_RECORD_CREATED`).
  - Click **"Export Verified Dataset (CSV)"** to download the clean verified tape.

---

### Minute 5: REST API Playground & Wrap-up (4:30 – 5:00)
- **Action**: Click **API Playground**.
- **Showcase**:
  - Execute live requests against Module H endpoints:
    - `GET /api/summary`
    - `GET /api/loans?limit=5`
    - `GET /api/exceptions?severity=CRITICAL`
    - `GET /api/verified-loans?limit=5`
    - `GET /api/audit`
  - Show live JSON responses and point to `/docs` for automated Swagger documentation.
  - Conclude with highlights from `docs/AI_DEVELOPMENT_LOG.md` and `docs/ARCHITECTURE.md`.
