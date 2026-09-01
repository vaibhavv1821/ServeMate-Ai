# 18 - External Integrations

**Current Phase Status**: Phase 1 Database Integration Setup

---

## 1. Implemented Integrations

### Neon Hosted PostgreSQL Database
- **Official Website**: https://neon.tech
- **Purpose**: Serverless PostgreSQL database hosting for production and development data persistence.
- **Account Requirements**: Free account registered at neon.tech.
- **Credentials / API Key**: Connection String (`DATABASE_URL`).
- **Where Stored**: `backend/.env` file under key `DATABASE_URL`.
- **Free Tier Available**: Yes (0.5 GiB storage, free compute units, branch database environments).
- **Security Considerations**: SSL mode enforced (`?sslmode=require`). Credentials are never hardcoded or checked into version control.

---

## 2. Planned Integrations (`STATUS: PLANNED`)
- **Cloudinary**: Media storage for provider ID verification documents and service proof photos.
- **Google Gemini API / OpenAI**: Natural language service request classification and issue diagnostic tagging.
- **Nodemailer / SMTP Service**: Transactional email dispatch for booking confirmations and OTP verification.
