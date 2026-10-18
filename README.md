# Fichua Mtaa

Fichua Mtaa is an independent educational demonstration of a Kenyan county public-service reporting portal. Citizens can register, report local service issues, and follow progress. Administrators triage reports, record private notes, and review live service-delivery analytics. This is not an official government system.

## Features and roles

- **Citizens:** secure registration and sign-in, private request list and detail, reference numbers, status history, search by status, and optional photo evidence.
- **Administrators:** protected request queue, text/status/category filtering, request inspection, internal notes, status changes, and database-driven summary charts.
- **Lifecycle:** `PENDING → IN_PROGRESS → RESOLVED`. Backward transitions and skipping a step are rejected by the API. Submission starts in `PENDING`.
- **Categories:** Roads and Drainage, Water Supply, Waste Collection, Street Lighting, and Other.
- **Photo attachments:** compressed in the browser (maximum 1600 px edge, WebP preferred/JPEG fallback); only the compressed file is uploaded. Both client and backend enforce 512,000 bytes, and the backend checks JPEG/PNG/WebP file signatures before forwarding to Cloudinary. Uploads are optional.

## Technology

- Frontend: React, Vite, JavaScript, React Router, Fetch API, plain CSS, Recharts.
- Backend: Java 21, Spring Boot, Maven, Spring Web, Spring Data JPA, Spring Security, Bean Validation, BCrypt.
- Persistence: PostgreSQL, Hibernate, Flyway migrations.
- Deployment targets: Vercel (frontend), Render free web service (backend), Neon free PostgreSQL, and GitHub.
- Optional persistent image storage: Cloudinary. The [current plan page](https://cloudinary.com/pricing/compare-plans) describes a free plan. Its [upload preset documentation](https://cloudinary.com/documentation/upload_presets) notes that per-file limits are not available at the preset level, so the application enforces the strict byte limit in its own backend before forwarding the image. Confirm current provider quotas before a public launch.

## Architecture and repository layout

The frontend and backend are independent applications. The browser calls JSON REST endpoints under `/api`, using an HTTP-only server session cookie and a CSRF double-submit token. The backend owns authentication, authorization, input validation, transition rules, analytics aggregation and persistence. Citizens can only retrieve requests whose `citizen_id` matches their account; administrator routes and note DTOs are restricted to the `ADMIN` role.

```text
frontend/                       React/Vite application
  src/api/                      Fetch client and image compression
  src/components/               Shared layout and UI elements
  src/context/                  Authentication state
  src/pages/                    Public, citizen and admin screens
  src/styles.css                Responsive civic visual system
backend/                        Spring Boot/Maven application
  src/main/java/ke/fichuamtaa/  API, entities, security and setup
  src/main/resources/db/        Versioned Flyway PostgreSQL schema
README.md
render.yaml
vercel.json
```

## Prerequisites

- Windows 10/11, Java 21, Maven 3.9+, Node.js 20+ with npm, and PostgreSQL 15+.
- A local PostgreSQL server for development. Production can use Neon PostgreSQL.
- Cloudinary account only if photo uploads are desired. Requests without photos work without Cloudinary.

## Local setup (Windows PowerShell)

Open PowerShell in this repository. Create the database using a PostgreSQL account with database creation privileges:

```powershell
psql -U postgres -h localhost -d postgres -c "CREATE DATABASE fichuamtaa;"
```

Flyway runs automatically on backend startup and creates the schema from `backend/src/main/resources/db/migration`. For a repeatable local setup, copy the backend example to an ignored `backend/.env` file and replace the local password there. Spring Boot imports this optional file when started from `backend/`. Never commit `.env` files; `.gitignore` excludes them. Render continues to provide production settings through environment variables.

```powershell
Copy-Item backend/.env.example backend/.env
notepad backend/.env
```

Set `PORT=8081` in `backend/.env` if port 8080 is occupied, and set `DATABASE_URL`, `DATABASE_USERNAME`, and `DATABASE_PASSWORD` for your local PostgreSQL account. Keep the CORS origin at `http://localhost:5173` and the local cookie settings at `SESSION_COOKIE_SECURE=false` and `SESSION_SAME_SITE=lax`.

Start the backend (Flyway migrates on startup):

```powershell
cd backend
mvn spring-boot:run
```

In another PowerShell window, install and start the frontend:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

The Vite app is at `http://localhost:5173`; with the local port above, the API is at `http://localhost:8081/api`. Set `VITE_API_BASE_URL=http://localhost:8081/api` in `frontend/.env.local`. Vite exposes only variables prefixed with `VITE_`; never put database or Cloudinary secrets there.

## Administrator initialization

Public registration always creates a `CITIZEN`. To bootstrap the first admin, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the backend process environment before its first start. Use a unique password of at least 16 characters. On startup, the initializer creates that account only if the email is unused; if it belongs to a citizen, startup fails safely. Once created, remove the bootstrap password from the environment. Do not commit it or use a default production password. Manage subsequent admin accounts through a secured operational process; public role escalation is not exposed by the API.

## Tests and production builds

```powershell
cd frontend
npm test
npm run build

cd ..\backend
mvn test
mvn package
```

The current backend suite uses isolated unit tests and does not connect to a database. If you add database integration tests, use a dedicated local database named `fichuamtaa_test` or an isolated test environment; never point tests at Neon production. The frontend suite covers the image processing size/format boundary and upload error feedback. Keep test credentials separate from local and production values.

## Environment variables

| Variable | App | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | frontend | API origin including `/api` |
| `DATABASE_URL` | backend | JDBC PostgreSQL URL; Neon URLs must use `jdbc:postgresql://` |
| `DATABASE_USERNAME`, `DATABASE_PASSWORD` | backend | Database credentials |
| `DB_POOL_SIZE` | backend | Hikari pool maximum; default 5 for free-tier connection limits |
| `FRONTEND_ORIGIN` | backend | Exact browser origin allowed by credentialed CORS |
| `SESSION_COOKIE_SECURE`, `SESSION_SAME_SITE` | backend | Cookie policy; production should use `true` and `none` over HTTPS |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | backend | One-time initial administrator bootstrap |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | backend | Optional server-side signed Cloudinary upload configuration |

See `frontend/.env.example` and `backend/.env.example`. Render supplies `PORT`; the backend uses it automatically. For Neon, use the connection host/database/user/password from Neon and its SSL-enabled connection parameters. Keep pool size small and enable Neon’s pooled connection endpoint when required by its current connection limits.

## Deployment (free-tier-oriented)

1. Push this repository to GitHub.
2. Create a Neon PostgreSQL project. Copy the database host, database name, username and password into Render environment variables. Use Neon’s SSL connection mode and a pooled endpoint where appropriate. Do not commit the URL or credentials.
3. Create a Render Web Service from the repository. `render.yaml` uses `backend/` and the included Dockerfile. Select the free instance and set `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `FRONTEND_ORIGIN`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD`. Add Cloudinary variables only if enabling images. Render currently spins down free web services after 15 minutes without inbound traffic; a cold start takes about a minute. Check the [current free-tier limits](https://render.com/docs/free) before launch.
4. Deploy `frontend/` to Vercel. Set the project root to `frontend`, build command `npm run build`, output directory `dist`, and `VITE_API_BASE_URL=https://<render-service>.onrender.com/api`.
5. Update Render `FRONTEND_ORIGIN` to the exact deployed Vercel origin (no path). Keep `SESSION_COOKIE_SECURE=true` and `SESSION_SAME_SITE=none`. The browser session and CSRF cookie require HTTPS and credentialed CORS across the two origins.
6. Create/verify the initial administrator, then remove `ADMIN_PASSWORD` from Render after bootstrap. Test registration, sign-in, citizen ownership, admin-only APIs, and image-free request submission against the deployed URLs.

Neon, Render, Vercel and Cloudinary free-tier quotas and policies can change. See the providers’ current [Neon Free plan information](https://neon.com/blog/neon-free-plan-1-gb-per-project), [Vercel Hobby plan](https://vercel.com/docs/plans/hobby), [Render Free limits](https://render.com/docs/free) and [Cloudinary plans](https://cloudinary.com/pricing/compare-plans). The design limits the JDBC pool and avoids relying on a continuously warm backend, but free services can sleep or impose usage limits. Do not promise uptime or capacity beyond provider terms.

## Security notes and current limitations

- Session IDs are HTTP-only cookies, never local storage. Spring Security CSRF protection applies to state-changing requests. Production cookies require `Secure` and `SameSite=None` for the separately hosted frontend.
- Passwords are BCrypt hashes. Server validation and database uniqueness constraints back up client checks.
- Admin notes are only returned from protected endpoints; citizen request detail does not include note data.
- Photo uploads require Cloudinary configuration. Without it the system returns a useful error if a photo is selected; users can still submit requests without photos. Cloudinary uploads consume free-plan quotas and may fail when quotas or provider limits are reached.
- Authentication uses in-memory Spring sessions; free Render instances can restart, which logs users out. A production scale-out would need a shared session store, which is intentionally not added as a paid dependency.
- Email verification, password reset, department assignment, automated notifications, and public multi-admin management are not implemented.

## Screenshots

Add screenshots after running the application. Suggested captures: landing page, citizen request form, request progress timeline, and administrator dashboard.
