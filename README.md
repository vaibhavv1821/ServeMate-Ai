# ServMate 🛠️🤖

ServMate is a placement-ready, AI-assisted hyperlocal service marketplace connecting customers with verified local service professionals.

## 🚀 Key Platform Features (Overview)
- **Customer & Provider Portals**: Seamless service discovery and profile management.
- **Verification & Trust**: Provider verification by Admin, OTP-based service execution start, and before/after proof submission.
- **Smart Provider Matching**: Distance, availability, rating, experience, and service matching algorithms.
- **Real-Time Communication**: Customer-provider live status updates.
- **AI Service Classification**: Intelligent categorisation and assistance.
- **Analytics & Admin Hub**: Comprehensive platform administration.

---

## 🏗️ Architecture & Tech Stack

### Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, React Router DOM, Axios, Context API
- **Backend**: Node.js, Express.js (Modular Monolith with ES Modules), Prisma ORM, Zod, JWT, bcryptjs, Helmet, CORS
- **Database**: Hosted PostgreSQL (Neon)
- **Documentation**: `/docs` markdown suite + Automated PDF technical documentation generator

---

## 📁 Repository Structure

```
ServMate/
├── backend/                # Express.js REST API (Modular Monolith)
│   ├── prisma/            # Prisma Schema & Migrations
│   ├── src/
│   │   ├── config/        # Environment & App Configurations
│   │   ├── middlewares/   # Error handling, Auth, Security
│   │   ├── modules/       # Domain modules (auth, users, providers, etc.)
│   │   ├── utils/         # Helpers & custom Error classes
│   │   ├── app.js         # Express Application setup
│   │   └── server.js      # Server entry point
│   ├── .env.example
│   └── package.json
├── frontend/               # React + Vite Client Application
│   ├── src/
│   │   ├── api/           # Axios instance & API client modules
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # React Context providers (Auth, etc.)
│   │   ├── pages/         # Page views
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
├── docs/                   # Complete technical documentation suite
└── scripts/                # Utility scripts (PDF Generator, etc.)
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- Node.js `v18+` (v24 tested)
- npm `v9+`
- Neon PostgreSQL Account & Connection String

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in your DATABASE_URL in .env
npx prisma db push
npm run dev
```
Backend runs at `http://localhost:5000` (Health Check: `http://localhost:5000/api/v1/health`).

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Frontend runs at `http://localhost:5173`.

### 4. PDF Documentation Generation
From project root:
```bash
npm run docs:pdf
```
Generates `/docs/ServMate-Complete-Technical-Documentation.pdf`.

---

## 🧪 Test Results

Run each suite from `backend/` directory:

```bash
node --test tests/auth.test.js       # Phase 1 — 13/13 PASS
node --test tests/phase2.test.js     # Phase 2 — 27/27 PASS
node --test tests/location.test.js   # Location — 10/10 PASS
node --test tests/phase4.test.js     # Phase 4 — 13/13 PASS

# Or run all sequentially:
npm run test:all                      # 63/63 PASS
```

**Total: 63 automated integration tests — ALL PASSING ✔**

---

## 🤖 Phase 4: AI-Assisted Service Handling + Advanced Booking Resilience

### Features Added
- **AI Issue Analyzer** (`POST /api/v1/ai/analyze-service`): Powered by Google Gemini 1.5 Flash. Customers describe their problem in plain English; AI maps it to a validated database service category with urgency classification (NORMAL / URGENT / EMERGENCY) and a non-diagnostic disclaimer.
- **Heuristic Fallback**: If `GEMINI_API_KEY` is missing or the API call fails, keyword-based classification activates automatically — the marketplace is never blocked.
- **Rate Limiting**: Redis (Upstash) enforces max 5 AI requests per user per minute for cost control.
- **Emergency Mode**: When `urgency: 'EMERGENCY'`, Smart Matching applies priority modifiers (+15 availability bonus, +10 proximity bonus). Provider receives real-time `emergency_booking_received` Socket.io event.
- **Backup Provider Flow**: When a booking is REJECTED, customers can query ranked backup candidates (`GET /api/v1/bookings/:id/backup-candidates`) and atomically reassign to a backup (`POST /api/v1/bookings/:id/reassign-backup`) — with full double-booking protection preserved.
- **Frontend Integration**: `<ServiceIssueAnalyzer />` component on Services page and Customer Dashboard. Urgency selector in booking form. Backup Provider discovery modal in My Bookings page.

---

## 📖 Documentation
Detailed architectural and module documentation can be found in the [`/docs`](./docs) directory.
