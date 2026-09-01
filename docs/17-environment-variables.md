# 17 - Environment Variables Guide

**Current Phase Status**: Implemented (Phase 1 Baseline Templates)

---

## 1. Backend Environment Variables (`backend/.env.example`)

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Connection (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@ep-xyz.region.aws.neon.tech/servmate?sslmode=require"

# JWT Configuration (Phase 2)
JWT_SECRET=your_super_secret_jwt_key_min_32_characters
JWT_EXPIRES_IN=7d

# CORS Configuration
CLIENT_URL=http://localhost:5173
```

---

## 2. Frontend Environment Variables (`frontend/.env.example`)

```env
# API Base URL
VITE_API_BASE_URL=http://localhost:5000/api/v1
```
