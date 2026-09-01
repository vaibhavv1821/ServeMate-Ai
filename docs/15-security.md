# 15 - Security Standards & Practices

**Current Phase Status**: Implemented (Phase 1 Baseline Security Setup)

---

## 1. Implemented Baseline Security
1. **Helmet Middleware**: Secures Express apps by setting HTTP headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, etc.).
2. **CORS Configuration**: Restricts cross-origin requests to configured frontend domains.
3. **Zod Validation**: Input sanitization and schema enforcement on HTTP requests to prevent injection vulnerabilities.
4. **Environment Secrets Protection**: Complete exclusion of secrets (`.env`) from version control via strict `.gitignore`.

---

## 2. Planned Security Implementations (`STATUS: PLANNED`)
- Salted Password Hashing via `bcryptjs` (salt rounds >= 10).
- Rate limiting middleware on sensitive auth routes (`express-rate-limit` / Redis).
- HTTPS enforcement on production deployment (Render/Vercel).
