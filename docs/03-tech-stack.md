# 03 - Tech Stack

**Current Phase Status**: Implemented (Phase 1 Foundation Setup)

---

## 1. Core Stack Overview

| Layer | Technology | Reason Selected |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 + Vite | Lightning-fast build speeds, component-driven UI architecture. |
| **Styling** | Tailwind CSS | Utility-first CSS for rapid, modern, responsive UI design without bulky CSS files. |
| **Routing & State** | React Router DOM v6 & React Context API | Clean client-side routing and native state management without Redux overhead. |
| **HTTP Client** | Axios | Declarative HTTP client with interceptors for JWT token injection and error handling. |
| **Backend Runtime** | Node.js (v18+) with ES Modules (`"type": "module"`) | Standard JavaScript runtime enabling modern `import/export` syntax. |
| **Web Server** | Express.js | Industry-standard minimal, flexible web framework for RESTful APIs. |
| **ORM** | Prisma ORM | Type-safe database client, auto-generated migrations, intuitive schema definition. |
| **Data Validation** | Zod | Schema-first TypeScript/JavaScript validation for API body, query, and params. |
| **Database** | Hosted PostgreSQL (Neon) | Reliable serverless relational database with ACID compliance and SSL encryption. |
| **Security** | Helmet & CORS | Helmet sets HTTP security headers; CORS manages cross-origin resource access. |
| **Authentication** | JWT (`jsonwebtoken`) & `bcryptjs` | Stateless token authentication and salted password hashing. |

---

## 2. Planned Technologies (`STATUS: PLANNED`)

- **Redis**: Caching layer for provider availability and rate limiting.
- **Socket.io**: WebSockets for real-time customer-provider chat and booking updates.
- **Cloudinary**: Cloud image storage for provider ID verification and before/after service proof.
- **Gemini / OpenAI API**: AI service request classification and issue tagging.
- **Nodemailer**: Email notifications for booking confirmation and status changes.
- **Jest & Supertest**: Automated unit and integration testing suite.
