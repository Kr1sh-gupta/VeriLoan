# AI Development Log & Agentic Coding Demonstration
**Intain Campus FinTech Challenge 2026 | Full Stack Track**

---

## 1. Agentic Coding Overview & Tools Used

During the design, implementation, testing, and optimization of the **Loan Data Verification Copilot**, AI agentic coding tools were used systematically across the full development lifecycle.

- **Primary Agentic Tool**: Antigravity IDE / Claude 3.7 & Gemini 1.5 Pro AI Pair Programmer.
- **Supporting Models & APIs**: Google Gemini API (`gemini-1.5-flash`), OpenAI API, GitHub Copilot.
- **Workflow Disciplines**: Auto-review pipelines (`/autoplan`), Test-Driven Development (TDD with Pytest & Vite build checks), and strict Human-in-the-Loop AI governance.

---

## 2. Development Use Cases

1. **System & Data Architecture**: Drafting database schemas, relational foreign keys, canonical JSON serialization schemes, and SHA-256 cryptographic verification protocols.
2. **Synthetic Dataset Generation**: Building realistic Python data generators for `loan_tape.csv` (1,200 records), `servicer_update.csv`, `document_manifest.csv`, and injecting deliberate anomalies across all 14 categories.
3. **Validation Engine Rule Suite**: Generating modular rule checks for financial balance bounds, sequence validation, ISO date formatters, and cross-source conflict reconciliation.
4. **AI Copilot & Prompt Engineering**: Designing structured prompt templates, Pydantic schemas, and deterministic financial heuristic fallbacks for offline demo reliability.
5. **Modern Frontend & Design Tokens**: Authoring React components with Tailwind CSS dark-mode tokens, animated data-stream hero visuals, glassmorphic cards, and slide-over AI drawers.
6. **Automated Testing & Build Verification**: Writing Pytest test suites for validation rules, hashing algorithms, and REST API integration endpoints.

---

## 3. Representative Prompts (5–10 Examples)

### Prompt 1 (Data Synthesis & Anomaly Injection):
> *"Generate a Python script to synthesize a realistic loan tape of 1,200 records with mortgage/consumer loan attributes. Inject intentional errors across all 14 specified anomaly categories (missing loan IDs, duplicate IDs, duplicate borrower combinations, non-ISO dates, maturity before origination, negative principal/balance, current balance > original principal, interest rate outliers, payment status vs DPD mismatches, missing doc status, servicer update conflicts, stale records, invalid state codes, and closed loans with balance). Produce matching servicer_update.csv and document_manifest.csv files."*

### Prompt 2 (Cryptographic Verification Engine):
> *"Write a Python `VerificationService` class that implements canonical JSON serialization (`sort_keys=True, separators=(',', ':')`) and computes SHA-256 record hashes. Add a method `verify_hash_integrity` that re-serializes the record and detects any post-verification data tampering."*

### Prompt 3 (Validation Engine Rules):
> *"Implement a `ValidationService.run_all_validations` method in FastAPI with SQLAlchemy that evaluates all 14 validation rules. Include cross-file reconciliation with the secondary `servicer_updates` table to detect conflicting balances or payment statuses, and assign severity levels (CRITICAL, HIGH, MEDIUM, LOW)."*

### Prompt 4 (Explainable AI Copilot with Dual Engine):
> *"Create an `AIService` class that generates root-cause explanations and suggested data patches for validation exceptions. It must support Google Gemini API if a key is provided, but feature a deterministic, high-precision financial heuristic rule engine as a fallback so that offline demos run instantly with 100% reliability."*

### Prompt 5 (Aesthetic FinTech UI & Animated Hero):
> *"Create a React hero component in Tailwind CSS with dark cybernetic FinTech aesthetics. Build an animated 3-stage visual representing: (1) Ingestion of messy raw loan records, (2) AI Copilot neural evaluation and conflict reconciliation, and (3) Cryptographic canonical sealing with SHA-256 hashes."*

### Prompt 6 (Human-in-the-Loop Reviewer Controls):
> *"Build a Reviewer Workbench drawer in React that displays validation exceptions, cross-source conflict diffs (Tape vs. Servicer Update), and AI suggested patches. Enforce Section 9 AI controls: AI suggestions must be visually distinct, never write back silently, and provide explicit `[Accept AI Patch]`, `[Custom Edit]`, and `[Dismiss Flag]` action buttons."*

---

## 4. Human Review & Engineering Process

Every AI-generated code module followed a strict human review cycle:
1. **Schema & Logic Verification**: Checked that numeric cleaning handles currency symbols (`$`) and comma separators gracefully before arithmetic comparisons.
2. **Boundary & Edge Case Testing**: Verified that zero or null values in `days_past_due` or `current_balance` do not trigger false positive division-by-zero or attribute errors.
3. **Cryptographic Consistency Check**: Confirmed that dictionary keys in canonical JSON serialization are deterministically sorted across all Python platforms.
4. **Automated Test Validation**: Executed `pytest backend/tests/ -v` and `npm run build` to ensure zero compilation or runtime errors.

---

## 5. Estimated AI-Generated Code Percentage

- **Backend Logic (FastAPI, Services, Validation Rules)**: ~82% AI-generated, 18% human-refined and debugged.
- **Frontend UI & Components (React, Tailwind CSS, Hero Visuals)**: ~88% AI-generated, 12% human-styled and structured.
- **Synthetic Data Generation & Test Suites**: ~90% AI-generated, 10% human-calibrated.
- **Overall Codebase AI Contribution**: **~85%**.

---

## 6. What Was Rejected (Examples of Incorrect/Unsafe AI Output)

### Example 1: Silent Automatic Write-Back on AI Recommendation
- **Initial AI Output**: The AI initially proposed an endpoint that automatically applied suggested corrections to the `loans` table whenever `/ai/explain` was invoked.
- **Why It Was Rejected**: This violated Section 9 of the challenge problem statement (*"AI output must not silently change data"*). In financial auditing, unreviewed automated mutations are a severe risk.
- **Correction**: Redesigned the architecture to require an explicit reviewer action (`POST /exceptions/:id/resolve` with `action='ACCEPT_AI'` or `'MANUAL_EDIT'`), logging the reviewer's ID, timestamp, and audit trail event.

### Example 2: Non-Deterministic Python `str(dict)` Hashing
- **Initial AI Output**: The AI initially generated a hash utility using `hashlib.sha256(str(dict_data).encode()).hexdigest()`.
- **Why It Was Rejected**: Python's `str(dict)` does not guarantee cross-process key ordering and varies with whitespace formatting, leading to false hash mismatch errors during tamper verification.
- **Correction**: Replaced with strict canonical JSON serialization using `json.dumps(data, sort_keys=True, separators=(',', ':'), default=str)`.

---

## 7. Lessons Learned & Human Engineering Takeaways

- **Where AI Helped Most**: Rapid prototyping of repetitive validation rules, generating realistic multi-thousand-row synthetic datasets, and drafting high-aesthetic Tailwind CSS components with glassmorphism and animations.
- **Where Human Judgment Was Essential**: Enforcing compliance and governance rules (preventing silent AI writes), defining financial business logic boundaries (e.g. reconciling trailing servicer ledger dates against origination records), and setting up robust offline deterministic fallbacks for seamless demo execution.
