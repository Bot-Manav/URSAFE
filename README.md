# Secure DMS — SIH26190 (The Catalyst)

Secure Digital Document Management System for legal and investigation
documents. Local-first MVP: no cloud storage dependency — Postgres runs in
Docker, encrypted files are written to a local disk folder.

## Stack

- **Backend:** Spring Boot 3 / Java 21, Spring Security, Spring Data JPA
- **Database:** PostgreSQL (Docker)
- **Frontend:** React + TypeScript + Vite
- **Crypto:** AES-256-GCM (document encryption at rest), SHA-256 (integrity
  hashing), BCrypt (password hashing), JWT/HS256 (session auth)

## Quick start

### 1. Prerequisites
Java 21, Maven, Node 18+, Docker.

### 2. Generate secrets and configure env
```bash
cp .env.example .env
# then edit .env and fill in:
openssl rand -base64 64   # -> JWT_SECRET
openssl rand -base64 32   # -> AES_KEY
# also set a real DB_PASSWORD
```
`.env` is git-ignored. Never commit real secrets. In production these
belong in a secrets manager / KMS, not a flat file — see "Hardening" below.

### 3. Start Postgres
```bash
docker compose --env-file .env up -d
```

### 4. Run the backend
```bash
cd backend
export $(grep -v '^#' ../.env | xargs)   # load .env into the shell
mvn spring-boot:run
```
Backend starts on `http://localhost:8080`. It will refuse to start if
`JWT_SECRET`, `AES_KEY`, or `DB_PASSWORD` are missing or too short — this
is intentional (fail closed, not fail open).

### 5. Run the frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend on `http://localhost:5173`.

### 6. Try it
Register a user (any role except ADMIN — that's blocked by design, see
below), create a case, upload a document, download it back. Tamper with
the `.enc` file under `storage/documents/<caseId>/` directly on disk and
try downloading again — the integrity check will catch it and refuse to
serve the file.

## How documents are protected

1. File arrives at `POST /api/cases/{caseId}/documents`
2. SHA-256 hash computed on the **plaintext** bytes
3. AES-256-GCM encrypts the bytes with a fresh random IV
4. Ciphertext written to disk under a **server-generated UUID filename**
   (the original filename never touches the filesystem path — see BOLA/
   path-traversal notes below)
5. Metadata (hash, IV, case, uploader) saved to Postgres; an audit log row
   is written
6. On download: ciphertext is decrypted, the SHA-256 is **recomputed** and
   compared against the stored hash. Mismatch = refuse to serve, log a
   `VERIFY_FAIL` audit event, return HTTP 409.

## Repo layout

```
backend/     Spring Boot API
frontend/    React SPA
storage/     Encrypted documents land here at runtime (git-ignored)
docker-compose.yml   Postgres only
.env.example
```

## OWASP Top 10 (2021) — how each is addressed

| # | Risk | Where it's handled |
|---|---|---|
| A01 | Broken Access Control | `CaseAccess` grant table + `CaseService.assertAccess()`, re-checked on **every** case/document request (not just at login) — see BOLA note below. Route-level `@PreAuthorize` role checks on top. |
| A02 | Cryptographic Failures | AES-256-GCM for documents at rest, BCrypt(strength 12) for passwords, TLS termination expected at reverse proxy in prod (see Hardening). Secrets never hardcoded — loaded from env, app refuses to boot without them. |
| A03 | Injection | All DB access via Spring Data JPA / parameterized queries — no string-concatenated SQL anywhere. Bean Validation (`@Pattern`, `@Size`, `@Email`) on every DTO rejects malformed input before it reaches a query or the filesystem. |
| A04 | Insecure Design | Upload allow-lists file extension + declared content-type + size cap. Filenames are never used to build filesystem paths (UUID-based storage names) — eliminates path traversal by design, not by filtering. |
| A05 | Security Misconfiguration | Restrictive CORS allow-list (no wildcard), security response headers (CSP `default-src 'none'`, X-Frame-Options DENY, HSTS, nosniff), generic error responses (see A09), `ddl-auto: update` only for dev — use migrations in prod. |
| A06 | Vulnerable Components | Dependency versions pinned in `pom.xml`/`package.json`. Run `mvn versions:display-dependency-updates` and `npm audit` periodically — not automated in this MVP, flagged for CI. |
| A07 | Auth Failures | JWT with signature verification + expiry, BCrypt hashing, account lockout after repeated failed logins (`LoginAttemptService`), generic "invalid email or password" message for both wrong-password and unknown-email cases (no user enumeration), 12+ char password policy with complexity requirements. |
| A08 | Data Integrity Failures | SHA-256 hash verified on every document retrieval, AES-GCM auth tag independently detects ciphertext tampering. Public self-registration cannot create an ADMIN account (blocks privilege escalation via crafted request body). |
| A09 | Logging & Monitoring Failures | `AuditLog` table records every upload/download/login/grant/verify-fail with actor, action, IP, timestamp. `GlobalExceptionHandler` logs full stack traces server-side but returns only a generic message + status to the client — no internal detail leakage. |
| A10 | Server-Side Request Forgery | No user-supplied URLs are fetched by the backend anywhere in this MVP — not currently applicable, revisit if a URL-import feature is added later. |

### BOLA in detail (this was the main design decision)
A valid JWT proves *who* you are, not *what you're allowed to touch*.
Every case and document read/write goes through
`CaseService.assertAccess(caseId, actor)`, which checks an explicit
`case_access` grant row (or ADMIN role) — **on every single request**,
not cached from login. This is what stops User A from reading User B's
case just by guessing/incrementing a document ID.

### Path traversal in detail
`DocumentService` never uses the client-supplied filename to build a
filesystem path. Stored files are named `{server-generated UUID}.enc`
inside a folder named after the case's UUID. The original filename is
kept only as a display string (and is sanitized before storage). Every
resolved path is also checked with `.startsWith(caseDir)` before any
disk I/O as defence in depth.

### XSS in detail
This is a React SPA with no `dangerouslySetInnerHTML` anywhere — all
user-supplied text (filenames, case titles, names) goes through React's
default escaping. The backend also sends `Content-Security-Policy:
default-src 'none'` on every API response, and `Content-Disposition`
filenames are explicitly encoded to prevent header injection.

## Hardening for production (not done in this MVP, intentionally)

- Move `AES_KEY`/`JWT_SECRET` into AWS KMS / HashiCorp Vault instead of env vars
- Swap local disk storage for S3/MinIO with server-side encryption
- Add MFA (TOTP) on top of password auth
- Add magic-byte content sniffing on upload, not just extension/MIME allow-list
- Rate-limit at the reverse proxy (nginx/Cloudflare) in addition to the
  account-lockout logic already in place
- Replace `ddl-auto: update` with Flyway/Liquibase migrations
- Move JWT from sessionStorage to an httpOnly+Secure+SameSite cookie
  (requires re-enabling CSRF protection — see `SecurityConfig` comments)
- Wire up OCR/AI classification (Tesseract) — out of scope for this MVP,
  the plan/idea deck still describes it as the target end state

## Team

The Catalyst — SIH26190, Blockchain & Cybersecurity theme.
