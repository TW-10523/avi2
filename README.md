Digital Twin
Enterprise RAG‑Based Knowledge Assistant
📌 Overview
Digital Twin is a modular Retrieval‑Augmented Generation (RAG) platform designed for enterprise internal knowledge use cases such as HR policy Q&A and document intelligence.

The system follows a role‑based architecture, where:

Admins manage documents, analytics, and users

End users only consume information

It is built with clear separation of concerns across UI, API orchestration, and RAG intelligence layers.

🏗️ High‑Level Architecture
React UI
   ↓
Node.js API (Orchestrator & Access Control)
   ↓
Python RAG Engine
   ↓
RAG Knowledge Database
Infrastructure Services

MySQL → metadata, users, document records

Redis → caching & session support

Docker → service orchestration

👥 User Roles & Permissions
🔑 Admin
Upload documents to RAG database

View system analytics

Monitor user activity

Access all user query history

Manage RAG modes

👤 User
Ask questions via chat UI

View own query history

Read AI‑generated answers

No access to uploads or analytics

🧩 Core Modules
1️⃣ UI Layer (ui/)
Technology: React + pnpm

Login / SSO

Chat interface

Answer display

User history view

Role‑based UI rendering (Admin / User)

⚠️ UI never communicates directly with RAG.

2️⃣ API Layer (api/)
Technology: Node.js + TypeScript

Acts as the central control layer.

Responsibilities:

Authentication & role enforcement

Admin‑only file upload APIs

Routing requests to correct RAG mode

Collecting analytics & usage metrics

Returning formatted responses to UI

3️⃣ RAG Engine (rag/)
Technology: Python (Conda environment)

Responsibilities:

Document ingestion (Admin only)

Embedding & retrieval logic

Mode‑specific RAG processing

Returning retrieved answers to API

All uploaded files are stored in the RAG database and used for retrieval.

4️⃣ Infrastructure Layer
Dockerized Services

MySQL

Chroma DB

Redis

These services must be running before API & RAG.

▶️ How to Run the Project
Prerequisites
- Docker 24+ and Docker Compose v2
- Node.js 18+ (recommended 20+), pnpm 9+
- Python 3.10+ (virtualenv or conda)
- Optional: NVIDIA GPU + CUDA 12.x for faster RAG inference

✅ Step 1: Start Infrastructure
docker compose up -d
Verify: docker compose ps

Services started by Compose
- MySQL 8.0 → 3306 (seeded via api/src/mysql/scripts/*.sql)
- Redis → 6379 (password: abcd1234)
- Solr → 8983 (core: mycore)

✅ Step 2: Configure the app
- Global config: config/default.yml (also mirrored at api/config/default.yml)
   - Backend API: host/port, JWT secrets
   - RAG backend: host/port/url
   - Vector store and uploads paths
   - Models (Ollama/HuggingFace)
   - Azure AD SSO: TENANT_ID, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI
- Placeholders like <PROJECT_ROOT_DIR> are auto‑expanded at runtime.

✅ Step 3: Start the API (Node.js)
cd api
pnpm install
pnpm dev
Runs Koa API on 9090 with role‑based access and file uploads.
Optional:
- Background worker: pnpm worker
- Bull Board (job monitor): http://localhost:9999

✅ Step 4: Start the RAG Engine (Python/FastAPI)
cd rag
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py
Starts FastAPI on 8000; first run downloads models to rag/data/model.
Notes:
- GPU is auto‑detected in dev-init.sh; CPU fallback is supported.
- Retrieval config in config/default.yml → RAG.Retrieval

✅ Step 5: Start the UI (React/Vite)
cd ui-2
pnpm install
pnpm dev
Launches on http://localhost:7001 (proxy /dev-api → http://localhost:9090)

🔐 Login & SSO
Standard UI
http://localhost:7001
SSO Login
http://localhost:7001/login?sso=true
Authentication and role validation are handled by the API layer.

📤 Document Upload (Admin‑Only)
Only Admin users can upload documents

Uploaded documents are:

Validated

Stored in the RAG database

Indexed for retrieval

Users can immediately query newly uploaded content

📊 Analytics & Monitoring (Admin‑Only)
Admins can view:

Total queries per user

Document usage statistics

RAG mode usage

Query frequency & trends

Complete chat history of all users

🔁 RAG Mode Configuration
RAG behavior is configured in:

config/default.yml
Example:

RAG:
  mode: hr_policy
⚠️ Changing modes requires re‑uploading documents.

➕ Adding a New RAG Mode
Only two files are required.

API Side
api/src/ragclass/<mode_name>.ts
Must implement:

export interface RAGProcessor {
  upload(...)
  search(...)
}
RAG Side (Python)
rag/api/modeAPI/<mode_name>_api.py
Optional Solr access:

rag/utils/solr.py → get_solr_doc_by_id()
🔄 End‑to‑End Workflow
Admin uploads documents → stored in RAG DB

User submits a query via UI

API validates user & routes request

Python RAG engine retrieves relevant content

Answer returned to API

API sends formatted response to UI

Query & response logged for analytics

🎯 Key Design Principles
Role‑based access control

Modular microservice architecture

Admin‑controlled knowledge ingestion

Scalable RAG mode extension

Enterprise‑ready auditability

🧠 One‑Line Summary
Aviary Lite is an enterprise RAG platform where admins manage knowledge and analytics, while users securely access AI‑generated answers through a React UI, orchestrated by a Node.js API and powered by Python‑based RAG engines.

—

Appendix: Complete Project Setup and Configuration

Project Ports
- UI (Vite dev server): 7001
- API (Koa): 9090
- RAG (FastAPI): 8000
- FAQ Cache (optional): 8001
- Bull Board (jobs UI): 9999
- MySQL: 3306
- Redis: 6379
- Solr: 8983

Database Initialization (MySQL)
- Compose mounts api/src/mysql/scripts to /docker-entrypoint-initdb.d
- Creates core tables (user, group, roles, files, messages, support_tickets, notifications, etc.)
- Seeds default users and roles. Change passwords immediately in production.
- Data persists in data/volumes/data/mysql-data

Configuration Files
- Root: config/default.yml
- API: api/config/default.yml (kept in sync with root)
- Key sections:
   - Backend: host, port, jwtSecret, jwtRefreshSecret, tokenizer, context window
   - RAG.Backend: host, port, url
   - RAG.VectorStore: type, path (default rag/app/rag_db)
   - RAG.Uploads: rootDir, filesDir, uploadDirectory, maxFileSize
   - RAG.useFaqCache and FaqCacheSettings.cacheApiUrl (default http://localhost:8001)
   - Models: chat/summary/translate (Ollama), ragEmbeddingModel, ragRerankModel (HF)
   - AZURE_AD: TENANT_ID, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI

Environment Variables
- API: UPLOAD_DIR (default uploads)
- Python: standard Hugging Face envs (e.g., HF_HOME) respected; models cached under rag/data/model by config

Optional Services
- FAQ Cache (faq_database)
   - cd faq_database && pip install -r requirements.txt && python main.py
   - Runs at 8001 with /query, /status, /health endpoints
   - Enable by setting RAG.useFaqCache: true and adjusting RAG.FaqCacheSettings
- Solr (text extraction and page indexing)
   - dev-init.sh adds schema fields and precreates core mycore
   - Used by splitByPage pipeline for PDF indexing and hybrid search

Background Jobs
- A Bull queue is included for async tasks
- Start worker with pnpm worker
- Monitor at http://localhost:9999

API Endpoints (high level)
- Auth/User: /user/login, /user/logout, /user/getInfo, /user/list, /user/create, /user/update
- Files: /api/files/upload, /api/files, /api/files/tags, /api/files/preview/:storage_key, /api/files/download/:storage_key
- RAG tasks: /api/gen-task, /api/gen-task-output/*, /api/gen-task/getChatTitle
- Insights: /api/live-queries, /api/chat-history, /api/recent-chats
- Admin: /api/admin/users, /api/admin/activity, /api/admin/stats

RAG Engine Endpoints
- POST /upload (single file to collection)
- POST /upload-pdf-pages/solr (batch pages by Solr doc IDs)
- POST /search and /search/hybrid
- PUT /update, DELETE /collection, DELETE /record
- POST /check_embedding_model

Add a New RAG Mode
- API: api/src/ragclass/<mode_name>.ts implements RAGProcessor with upload() and search()
- RAG: rag/api/modeAPI/<mode_name>_api.py provides complementary endpoints
- Register and route mode in existing controllers; update config/default.yml if needed

Troubleshooting
- Ports in use: change Frontend/Backend/RAG ports in config/default.yml
- CUDA not available: set RAG.Retrieval.throwErrorWhenCUDAUnavailable: false (CPU fallback)
- Model downloads slow: pre‑set HF_HOME or cacheDir to a local mirror; ensure internet access
- MySQL init didn’t run: remove data/volumes/data/mysql-data and re‑up Docker (will re‑seed)