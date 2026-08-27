# DebugMind Production Deployment Guide (Render & Cloud Stack)

This guide walks through deploying **DebugMind** to Render using the included `render.yaml` Blueprint specification.

---

## 🛠️ Architecture Stack

- **Frontend**: Render Static Site (React 18 + TypeScript + Vite + Tailwind CSS)
- **Backend Engine**: Render Web Service (Python 3.9 + FastAPI + Uvicorn)
- **Database**: Managed Render PostgreSQL (PostgreSQL 17 + `pgvector` extension)
- **Cache**: Managed Render Redis (Sliding-window rate limiting & embedding cache)

---

## 🚀 1-Click Deployment on Render

### Step 1: Push Repository to GitHub
Ensure your repository is pushed to GitHub:
```bash
git push origin main
```

### Step 2: Create Render Blueprint
1. Log into your account at [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub repository (`202512105-priya/debugmind`).
4. Render will automatically read `render.yaml` and create:
   - **`debugmind-api`** (FastAPI Web Service)
   - **`debugmind-dashboard`** (React Static Site)
   - **`debugmind-postgres`** (Managed PostgreSQL)
   - **`debugmind-redis`** (Managed Redis)

### Step 3: Configure Environment Variables
In the Render dashboard for `debugmind-api`, set your secrets:
- `OPENAI_API_KEY`: `sk-proj-...`

---

## 🌐 Live Service URLs

Once deployed:
- **Frontend Dashboard**: `https://debugmind-dashboard.onrender.com`
- **Backend REST API**: `https://debugmind-api.onrender.com`
- **Interactive Swagger Docs**: `https://debugmind-api.onrender.com/docs`
