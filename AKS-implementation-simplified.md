# Single-User Local Setup Plan

## Overview
Run Credit Card Processor as a simple local app for one user. No authentication, no Kubernetes. Keep everything on the machine for minimum complexity.

## Prerequisites
- Windows 10/11 with PowerShell 7
- Python 3.11+
- Node.js 18+
- Git (optional, for updates)

## Directory layout
- `backend/`: FastAPI app using SQLite
- `frontend/`: Vue app
- `data/`: Local storage for database, uploads, exports

## 1) Backend (FastAPI + SQLite)

- Ensure dependencies:
```powershell
cd backend
python -m venv .venv
. .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

- Configure local settings (optional): create `backend/.env` if you want overrides
```ini
ENVIRONMENT=development
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000
```

- Run backend:
```powershell
cd backend
. .venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

Notes:
- Uses existing SQLite at `./data/database.db` (auto-created).
- No auth required; existing endpoints continue to work locally.

## 2) Frontend (Vue)

- Install and run dev server:
```powershell
cd frontend
npm install
npm run dev
```
- Open `http://localhost:3000`.

- To build static files:
```powershell
npm run build
```
Outputs will be in `frontend/dist/`. You can serve them via a simple static server or configure the backend to serve static files if desired.

## 3) Local file storage
- Uploads: `./data/uploads`
- Exports: `./data/exports`
- Backups: Copy the entire `./data/` folder to external storage when needed.

## 4) Optional packaging (later)
- Backend-only: package with PyInstaller into an executable.
- All-in-one desktop app: wrap frontend + backend with Tauri/Electron for a single installer.

## 5) Simple backup
- Windows Task Scheduler task running weekly to copy `data/` to a safe location:
```powershell
$src = "$PSScriptRoot\data"
$dst = "D:\Backups\CreditCardProcessor\$(Get-Date -Format yyyyMMdd)"
robocopy $src $dst /MIR
```

## 6) Troubleshooting
- Backend logs: console output (adjust `LOG_LEVEL` in `.env`).
- Frontend errors: browser devtools console.
- File permissions: ensure the user has read/write access to the `data/` directory.

## 7) Future upgrades
- If multi-user or remote access is needed later, migrate to a small VM with Docker Compose (backend, frontend, Postgres) and add Azure AD auth as needed.
