# VeriLoan DevOps & Branching Architecture Guide
**Repository: https://github.com/Kr1sh-gupta/VeriLoan**

---

## 🏗️ 1. Multi-Branch Architecture Overview

This project uses a decoupled branch architecture separating frontend and backend codebases while maintaining an automated, CI-verified assembly into the `main` branch.

```
       +-------------------------------------------------------------------+
       |                       GitHub Remote Repository                    |
       |               https://github.com/Kr1sh-gupta/VeriLoan             |
       +---------------------------------+---------------------------------+
                                         |
               +-------------------------+-------------------------+
               |                                                   |
               v                                                   v
      [ backend branch ]                                  [ frontend branch ]
    (FastAPI, Pytest, Rules)                            (React, Vite, Tailwind)
               |                                                   |
      +--------+--------+                                 +--------+--------+
      |                 |                                 |                 |
      v                 v                                 v                 v
[ feat/backend-* ] [ fix/backend-* ]                [ feat/frontend-* ] [ fix/frontend-* ]
      |                 |                                 |                 |
      +--------+--------+                                 +--------+--------+
               |                                                   |
               | (PR with automated CI checks)                     | (PR with automated CI checks)
               v                                                   v
      [ backend branch ]                                  [ frontend branch ]
               \                                                   /
                \                                                 /
                 \                                               /
                  +-----------------------+---------------------+
                                          |
                                          v
                      [ GitHub Action: Sync to Main Workflow ]
                        - Pulls latest frontend into /frontend
                        - Pulls latest backend into /backend
                        - Copies README, docs, data, docker-compose
                        - Executes Pytest & Frontend Vite Build
                        - Commits and updates `main` branch
                                          |
                                          v
                                   [ main branch ]
                             (Unified Assembled Monorepo)
```

---

## 🌿 2. Branch Naming & Contribution Rules

### A. Backend Development
- **Main Working Branch**: `backend`
- **Feature Branches**: `feat/backend-<feature-name>` (e.g. `feat/backend-gemini-stream`)
- **Bug Fix Branches**: `fix/backend-<bug-name>` (e.g. `fix/backend-dpd-calculation`)
- **Workflow**:
  1. Branch off `backend`: `git checkout -b feat/backend-my-feature backend`
  2. Make changes in `backend/` directory.
  3. Push and open PR targeting `backend` branch.
  4. GitHub Action `backend-ci.yml` runs automated Pytest suite.

### B. Frontend Development
- **Main Working Branch**: `frontend`
- **Feature Branches**: `feat/frontend-<feature-name>` (e.g. `feat/frontend-theme-toggle`)
- **Bug Fix Branches**: `fix/frontend-<bug-name>` (e.g. `fix/frontend-drawer-animation`)
- **Workflow**:
  1. Branch off `frontend`: `git checkout -b feat/frontend-my-feature frontend`
  2. Make changes in `frontend/` directory.
  3. Push and open PR targeting `frontend` branch.
  4. GitHub Action `frontend-ci.yml` runs automated TypeScript build validation.

---

## 🚀 3. Initial Push Commands (Run from Your Terminal)

### Step 1: Push Backend Branch
```bash
cd e:\intain\backend
git push -u origin backend
```

### Step 2: Push Frontend Branch
```bash
cd e:\intain\frontend
git push -u origin frontend
```

---

## ⚙️ 4. GitHub Actions Setup (One-Time Setup)

1. Go to your repository on GitHub: **`https://github.com/Kr1sh-gupta/VeriLoan`**.
2. Navigate to **Settings** -> **Actions** -> **General**.
3. Under **Workflow permissions**, select **"Read and write permissions"** and check **"Allow GitHub Actions to create and approve pull requests"**. Click **Save**.
4. Create the `.github/workflows/` directory in your repo (or copy the workflow files from the `main/.github/workflows/` folder):
   - `sync-to-main.yml`
   - `backend-ci.yml`
   - `frontend-ci.yml`
   - `docker-ci.yml`

---

## 🔄 5. How to Trigger Automated Sync to Main

### Method A: Manual Trigger (One-Click)
1. Go to **`https://github.com/Kr1sh-gupta/VeriLoan/actions`**.
2. Select the **"Sync Frontend & Backend to Main Branch"** workflow from the left sidebar.
3. Click **"Run workflow"** -> Select branch `main` -> Click the green **"Run workflow"** button.
4. The workflow will automatically pull the latest commits from `frontend` and `backend`, execute tests, and update `main`.

### Method B: Automated Trigger
Whenever you push to the `frontend` or `backend` branch, the `sync-to-main.yml` workflow will automatically trigger, validate all tests, and assemble the updated code into the `main` branch.
