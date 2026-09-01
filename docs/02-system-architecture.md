# 02 - System Architecture

**Current Phase Status**: Implemented (Phase 1 Foundation Setup)

---

## 1. Architectural Strategy: Modular Monolith

ServMate avoids microservice over-engineering by using a **Modular Monolith** pattern inside a single Node.js Express backend repository (`/backend`).

### Why Modular Monolith?
- **High Cohesion, Low Coupling**: Each domain feature (Auth, Users, Providers, Bookings, Services, Reviews) lives in its dedicated module folder with its own routes, controller, service, and validation logic.
- **Simplified Deployment**: Single deployment unit to platforms like Render, avoiding multi-container orchestration overhead.
- **Easy Transition**: If any module (e.g., Notification or AI) experiences extreme load, its clean internal boundaries make it easy to break out into a microservice in the future.

---

## 2. High-Level System Architecture Diagram

```
+-----------------------------------------------------------------------+
|                           CLIENT TIER                                 |
|  React 18 + Vite SPA (Tailwind CSS, React Router, Context API)        |
+-----------------------------------+-----------------------------------+
                                    |
                                    | HTTPS / REST APIs
                                    v
+-----------------------------------------------------------------------+
|                           BACKEND TIER                                |
|  Express.js Server (Node.js ES Modules)                               |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  | Global Middlewares: Helmet | CORS | RequestLogger | ErrorHandler|  |
|  +--------------------------------+--------------------------------+  |
|                                   |                                   |
|  +--------------------------------v--------------------------------+  |
|  | Domain Modules:                                                 |  |
|  |  - Auth Module (JWT, bcryptjs)                                |  |
|  |  - User Module                                                  |  |
|  |  - Provider Module                                              |  |
|  |  - Booking Module                                               |  |
|  |  - Services Module                                              |  |
|  |  - Admin Module                                                 |  |
|  +--------------------------------+--------------------------------+  |
|                                   |                                   |
|  +--------------------------------v--------------------------------+  |
|  | Data Layer: Prisma ORM                                          |  |
|  +--------------------------------+--------------------------------+  |
+-----------------------------------+-----------------------------------+
                                    |
                                    | PostgreSQL Wire Protocol (SSL)
                                    v
+-----------------------------------------------------------------------+
|                          DATABASE TIER                                |
|  Hosted PostgreSQL (Neon Serverless PostgreSQL Database)              |
+-----------------------------------------------------------------------+
```

---

## 3. Directory Layout Standard

```
backend/src/
├── config/             # App & DB configuration
├── middlewares/        # Express global & route middlewares
├── utils/              # Helper utilities & custom AppError
└── modules/            # Domain Business Modules
    ├── auth/           # Authentication endpoints & business logic
    ├── users/          # User profile operations
    ├── providers/      # Provider verification & listings
    ├── bookings/       # Booking & OTP execution workflow
    ├── services/       # Service catalog management
    └── admin/          # Admin oversight endpoints
```
