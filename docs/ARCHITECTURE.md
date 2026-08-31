# Loan Data Verification Copilot — Architecture Note
**Intain Campus FinTech Challenge 2026 | Full Stack Track**

---

## 1. System Overview & Problem Statement

Financial platforms depend on loan-level data for diligence, securitization, risk analytics, and servicing. However, loan tapes rarely arrive clean—they often contain missing identifiers, date format corruptions, negative balances, balance-to-principal violations, conflicting multi-source updates, and stale records.

The **Loan Data Verification Copilot** provides an end-to-end full-stack console that ingests multi-source loan tapes, runs a high-performance 14-rule validation engine, assists reviewers via an explainable AI Copilot with transparent human-in-the-loop controls, and seals records into canonical JSON with SHA-256 cryptographic hashes and an immutable audit trail.

---

## 2. High-Level System Architecture

```
+-----------------------------------------------------------------------------------+
|                        Next.js / React 18 Web Console                             |
|  - Landing Page with Cybernetic Visual Transformation Core                        |
|  - Data Operator Console (CSV Streaming, Raw Explorer, Batch Health)              |
|  - Reviewer Workbench (Exception Queue, Side-by-Side Diff, AI Copilot Drawer)     |
|  - Data Consumer Explorer (Verified Records, Live SHA-256 Verifier, CSV Export)   |
|  - REST API Playground (Live Interactive JSON Queries)                            |
+------------------------------------------+----------------------------------------+
                                           | HTTP REST API (JSON)
                                           v
+-----------------------------------------------------------------------------------+
|                            FastAPI Backend Service                                |
|  +--------------------+  +----------------------+  +---------------------------+  |
|  | Ingestion Engine   |  | Validation Engine    |  | AI Review Assistant       |  |
|  | - CSV Streamer     |  | - 14+ Concrete Rules |  | - Gemini / LLM Client     |  |
|  | - Lineage Mapper   |  | - Severity Scorer    |  | - Deterministic Fallback  |  |
|  +--------------------+  +----------------------+  +---------------------------+  |
|  +-----------------------------------------------------------------------------+  |
|  |                Verification & Cryptographic Seal Engine                     |  |
|  | - Deterministic Canonical JSON Serializer                                   |  |
|  | - SHA-256 Cryptographic Hasher (Tamper Detection)                          |  |
|  | - Immutable Audit Logger (State Machine Tracking)                           |  |
|  +-----------------------------------------------------------------------------+  |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                            SQLite / PostgreSQL Database                           |
|  - users, upload_batches, loans, servicer_updates, document_manifests             |
|  - validation_exceptions, verified_loans, audit_events                            |
+-----------------------------------------------------------------------------------+
```

---

## 3. Core Engine Components

### A. Data Ingestion & Normalization (`IngestionService`)
- Parses multi-source CSV files (`loan_tape.csv`, `servicer_update.csv`, `document_manifest.csv`).
- Preserves raw source inputs (`raw_data` JSON column) and tracks batch lineage (`upload_batches`).
- Normalizes numeric strings (handling `$`, `,`), ISO dates, and loan status enumerations.

### B. Validation Engine (`ValidationService`)
Executes 14 distinct rule checks across 8 risk categories:
1. `VAL-001` (Mandatory): Missing loan ID detection.
2. `VAL-002` (Integrity): Duplicate loan IDs across portfolio.
3. `VAL-003` (Integrity): Duplicate borrower + original principal + origination date.
4. `VAL-004` (Format): Non-ISO date format detection.
5. `VAL-005` (Logic): Maturity date occurring before origination date.
6. `VAL-006` (Financial): Negative principal or current balance.
7. `VAL-007` (Financial): Current balance exceeding original principal without negative amortization rider.
8. `VAL-008` (Financial): Interest rate outside regulatory bounds [0.0%, 36.0%].
9. `VAL-009` (Consistency): Payment status vs. Days Past Due mismatches (e.g. CURRENT with 90 DPD).
10. `VAL-010` (Documentation): Missing promissory note or expired title policy in document manifest.
11. `VAL-011` (Reconciliation): Inter-file conflict between loan tape and secondary servicer updates.
12. `VAL-012` (Freshness): Stale loan records (>180 days since last update).
13. `VAL-013` (Format): Invalid US state postal codes.
14. `VAL-014` (Status): Loans marked `PAID_OFF` or `CLOSED` carrying positive balances.

### C. AI Review Assistant & Governance (`AIService`)
- **Dual-Mode AI Provider**: Integrates with Google Gemini API with seamless fallback to deterministic financial heuristic reasoning for 100% offline reliability.
- **Required Controls Enforced**:
  - AI recommendations are displayed separately from human decisions.
  - Reviewer has explicit `[Accept AI Patch]`, `[Custom Edit]`, and `[Dismiss Flag]` controls.
  - Full prompt, model identifier, and response metadata are logged in the audit trail.
  - **Zero Silent Modification**: System never modifies data without reviewer action.

### D. Cryptographic Verification & Audit Trail (`VerificationService` & `AuditService`)
- Serializes verified record into deterministic canonical JSON (`sort_keys=True, separators=(',', ':')`).
- Computes cryptographic SHA-256 hash stored in `verified_loans`.
- Provides live tamper detection by recalculating hash on-the-fly and comparing with sealed hash.
- Logs every lifecycle transition (`FILE_UPLOADED`, `VALIDATION_RUN`, `AI_SUGGESTION_GENERATED`, `FIELD_EDITED`, `RECORD_APPROVED`, `VERIFIED_RECORD_CREATED`, `EXPORT_GENERATED`).

---

## 4. API Design (`Module H`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/summary` | Real-time system health, exception counters, and data quality score |
| `GET` | `/api/loans` | Paginated raw and normalized loan records with search and filters |
| `GET` | `/api/loans/:id` | Full loan detail with associated exceptions, servicer updates, and docs |
| `PUT` | `/api/loans/:id` | Manual field adjustment with automatic audit logging |
| `GET` | `/api/exceptions` | Filterable exception queue with AI recommendations |
| `POST` | `/api/exceptions/:id/resolve` | Resolve exception (`ACCEPT_AI`, `MANUAL_EDIT`, `DISMISS`, `REJECT`) |
| `POST` | `/api/ai/explain` | Generate AI explanation, suggested patch, and confidence score |
| `GET` | `/api/verified-loans` | Paginated verified records with SHA-256 hashes |
| `GET` | `/api/verified-loans/:id` | Verified record with live cryptographic hash tamper verification |
| `POST` | `/api/verified-loans/verify-all-clean` | Batch verification of all clean loans |
| `GET` | `/api/verified-loans/export/csv` | Download canonical verified dataset in CSV format |
| `GET` | `/api/audit/:loanId` | Immutable chronological event history for a loan |

---

## 5. Architectural Trade-offs & Decisions

1. **FastAPI vs. Express**:
   - *Decision*: Selected FastAPI with Pydantic and SQLAlchemy.
   - *Rationale*: Native Python type safety, automated OpenAPI documentation, high async throughput, and unified integration with AI/LLM SDKs and cryptographic hashing.

2. **Deterministic Offline AI Engine vs. Pure Cloud LLM**:
   - *Decision*: Implemented dual-engine AI service with cloud Gemini API and deterministic local heuristic fallback.
   - *Rationale*: Guarantees 100% demo reliability, zero latency dependency during live evaluation, and deterministic precision for structured financial anomaly patches.

3. **In-Database Canonical Serialization vs. Blockchain Storage**:
   - *Decision*: Canonical JSON + SHA-256 hashing stored in relational tables with cryptographic recalculation endpoints.
   - *Rationale*: Eliminates high gas fees and blockchain setup overhead while providing mathematical proof of record immutability and instant verification.
