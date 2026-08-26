# Backend Changelog — VeriLoan

All notable changes to the backend service will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-26

### Added
- **FastAPI Core Application**: REST API backend with modular routing (`auth`, `ingest`, `loans`, `exceptions`, `ai`, `verified_loans`, `audit`, `summary`).
- **14-Rule Validation Engine**: Automated multi-category rules (`VAL-001` to `VAL-014`) with severity scoring (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- **Explainable AI Copilot Service**: Dual-engine architecture integrating Google Gemini API (`gemini-1.5-flash`) with a deterministic local financial heuristic engine for 100% offline resilience.
- **Cryptographic Verification Service**: Deterministic canonical JSON serialization and SHA-256 record hashing with on-the-fly tamper verification.
- **Immutable Audit Service**: Event logging for every state transition across the loan verification lifecycle.
- **Multi-Source CSV Ingestion**: Parsers for primary loan tapes, secondary servicer updates, and document manifests.
- **Pytest Automated Test Suite**: 12 comprehensive unit and integration tests covering validation rules, hashing algorithms, and REST endpoints.
- **Containerization**: Backend Dockerfile with Python 3.11-slim.
