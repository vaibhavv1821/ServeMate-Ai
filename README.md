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

## 📖 Documentation
Detailed architectural and module documentation can be found in the [`/docs`](./docs) directory.
