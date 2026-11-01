# SOLEVERSE Phase 11 Security Audit

**Audit date:** 2026-10-27  
**Scope:** Local source, configuration, dependencies, tests, and all 17 Supabase migration files. This is a static review of the project as present in this workspace; it is not a penetration test or a verification of the deployed Supabase project.

## Executive summary

No confirmed Critical or High vulnerability was found in the reviewed local code or SQL migrations. The admin path is guarded in the React router and privileged admin RPCs perform database-side authorization checks. Customer data access is implemented with owner-scoped policies/RPCs. SQL static checks cover RLS enablement, `SECURITY DEFINER` search paths, and sensitive grants.

Two important residual concerns remain:

1. Demo payment success is intentionally a mock outcome, not a bank-verified event. A signed-in customer can call the authenticated session-finish RPC directly with `success`; no frontend-only design can prove a simulation result came from a genuine payment. This can create a **demo-paid** order and decrement stock, but cannot move real money. A trusted payment verifier would be required to prevent this in a real-payment system.
2. No deployment-specific security-header configuration is present in the project. Effective response headers depend on the eventual hosting provider and have not been verified.

## Findings

### Critical

None verified.

### High

None verified.

### Medium

#### M-1 — Demo success is client-selectable, not independently verifiable

- **Evidence:** `finish_demo_payment_session` accepts an authenticated session ID and a `p_result` supplied by the caller, including `success`, in `supabase/migrations/20261027000200_demo_payment_sessions.sql`. The RPC validates session ownership, expiry, server-calculated amount and stock before creating the order, but there is no external payment attestation.
- **Impact:** A customer who owns a pending session can bypass the visual simulation and invoke the RPC with `success`. This can create an order stored using the existing simulated payment status and reserve stock. It cannot charge or transfer money.
- **Remediation:** Keep this explicitly demo-only and never represent the result as bank-confirmed. If business-grade payment integrity is required, use a trusted backend/verifier for payment outcomes; a client-side secret, UI restriction, or public RPC flag cannot establish that proof. No “real payment” integration was added.
- **Disposition:** Unresolved by design and prominently disclose as a limitation. Restricting this RPC to the client’s selected UI path would not fix the trust issue.

### Low

#### L-1 — Production security headers are not configured in this workspace

- **Evidence:** The project contains Vite configuration and `index.html`, but no Vercel, Netlify, Cloudflare Pages, or other hosting header configuration was found.
- **Impact:** Depending on host defaults, production responses may lack defense-in-depth headers such as HSTS, `X-Content-Type-Options`, a restrictive `Content-Security-Policy`, `frame-ancestors`, and a deliberate `Referrer-Policy`.
- **Remediation:** Configure headers at the selected hosting provider. Build a CSP against actual required origins (Supabase, fonts, image storage, and any model assets), test it in report-only mode first, then enforce it. Enable HSTS only when the production domain is HTTPS-only.
- **Disposition:** Unresolved here because the deployment provider and production origins are not configured in this project. No speculative CSP was added that could break Supabase or product media.

### Informational

#### I-1 — Deployed Supabase permissions and migration state could not be verified

- **Evidence:** Review was limited to local migration files. No live Supabase project or local PostgreSQL test server was queried. The workspace is not a Git repository, so whether any local or deployed database differs from the checked-in migrations cannot be determined.
- **Impact:** Effective deployed grants, RLS policies, migration order, existing records, Auth settings, Storage policy state, and actual RPC behavior remain unverified.
- **Remediation:** Apply only migrations that are not already applied, in the documented order, in a controlled Supabase project; then test owner/admin positive and negative cases using separate test accounts. Do not reset production data.

#### I-2 — Browser authentication relies on the standard Supabase SPA session model

- **Evidence:** `src/lib/supabaseClient.js` enables persisted sessions and token refresh in the browser. No unsafe HTML rendering sink (`dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function`) was found in application source.
- **Impact:** As with any browser SPA, a future XSS flaw could access the browser session. This review found no current unsafe HTML sink, but cannot eliminate future dependency or content risks.
- **Remediation:** Keep dependencies patched, preserve React's escaped rendering, validate admin-managed content/URLs, deploy a tested CSP, and avoid storing additional credentials in browser storage.

## Verified controls

- **Routes and authorization:** Customer routes use `ProtectedRoute`; `/admin` uses `AdminRoute`, which checks the current user against the database admin RPC and rechecks periodically/on visibility. This is a UI guard, not the security boundary: privileged SQL operations also check administrator authorization.
- **Supabase configuration:** The browser uses only `VITE_SUPABASE_URL` and a public anon/publishable key; `readSupabaseConfig` rejects recognized service-role/secret keys. `.gitignore` excludes `.env` and `.env.*` while permitting `.env.example`. The local `.env` file was not opened or printed. Because this workspace has no Git metadata, tracked status could not be verified.
- **Transport hardening implemented:** `src/lib/supabaseConfig.js` now requires HTTPS for remote Supabase hosts, allowing HTTP only for loopback development hosts (`localhost`, `127.0.0.1`, `[::1]`). Tests cover both allowed and denied cases.
- **Data boundaries:** Profile service derives the row ID from `auth.getUser()` rather than caller input. Cart and order services do not send trusted prices. Order creation uses the existing database RPC for authoritative pricing, stock locking, ownership and idempotency. Customer order reads do not use a client-supplied user ID as authorization.
- **Demo payment:** SQL migrations preserve the existing valid status values (`simulated_online`/`simulated` and COD `due_on_delivery`). Session create/finish logic is owner-scoped, time-limited, and checks server-side totals and stock; order/session changes use a transaction. No card number, CVV, UPI PIN, or bank credential column or parameter was found in the demo-payment SQL. The mock result itself remains client-selectable (M-1).
- **Admin safeguards:** Local migrations check admin authorization inside privileged RPCs; the admin allow-list is not client-writable, and admin user-management functions include self-removal/last-admin protections. Admin order functions do not permit customers to change trusted payment totals/status.
- **Storage and uploads:** The product image upload UI/service restricts file MIME types and size, uses random object names, and the gallery migration defines admin-only writes. Public product images are intended to be public; do not store private user files in that bucket.
- **Input/output handling:** React renders text through escaped JSX; no direct HTML injection sink was found. Login redirects are constrained to same-site paths. Card fields are local-only mock inputs; do not enter real card data.
- **Dependencies:** `npm audit --omit=dev` reported **0 advisories** among 109 production dependency entries (189 total dependency entries in the lockfile). This reflects the registry audit at the time run, not a guarantee of future safety.
- **Abuse controls:** Supabase Auth provides rate-limit responses surfaced by the client. No custom application rate limiter exists; configure Auth rate limits and abuse protection in the Supabase dashboard for production.

## Database audit scope and limitations

All 17 local files in `supabase/migrations` were statically reviewed for schema changes, RLS policies, grants, triggers, RPC authorization, search paths, and exposure. The review covered profiles, cart, catalogue, order creation, admin access and user management, galleries/storage, delivery confirmations, and demo sessions. No confirmed SQL security issue met the reporting threshold in the local migrations.

The static test suite checks that created tables enable RLS, `SECURITY DEFINER` functions pin an empty `search_path`, orders are not client-writable, admin RPCs check authorization, user-management protections remain, and demo sessions are owner-scoped. Static checks do not prove the effective privileges in a deployed database. The local PostgreSQL harness was not run because PostgreSQL client/server tools are unavailable in this environment.

## Changes made for this audit

- `src/lib/supabaseConfig.js`: disallow plaintext HTTP for remote Supabase URLs while retaining local loopback development.
- `src/utils/auth.test.js`: regression tests for HTTPS enforcement and local HTTP allowance.
- No SQL policy rewrite or data-changing migration was made.

## Manual steps and deployment checklist

1. Confirm which migrations are already applied in the intended Supabase project; do not rerun selectively without reviewing its current state.
2. If demo payments are not yet configured, apply `supabase/migrations/20261027000100_demo_payment_methods.sql` first, then `supabase/migrations/20261027000200_demo_payment_sessions.sql`. Apply only after the required catalogue/orders, Phase 7 admin, and customer delivery-confirmation migrations listed in `README.md`. These SQL files have **not** been applied by this audit.
3. Use a separate test Supabase project and two customer identities to verify that customers cannot read each other's profiles, carts, orders, delivery confirmations, or payment sessions; verify anonymous and non-admin calls to every admin RPC are denied.
4. Verify Supabase Auth email confirmation, redirect URLs, password policy, MFA for administrators where available, and Auth rate limits in the dashboard.
5. In the deployment provider, set the public Supabase URL/key as build variables only; never use a service-role/secret key in `VITE_*` variables. Keep production Supabase URLs HTTPS.
6. Configure and test deployment security headers (CSP, HSTS, frame restrictions, MIME sniffing protection, and referrer policy) against the actual deployed origins.
7. Re-run dependency audits and tests regularly, and investigate any future XSS or dependency alerts.

## Validation performed

- `npm test`: **137 passed, 0 failed**.
- `npm run build`: **passed**. Vite emitted its existing non-blocking warning about chunks larger than 500 kB.
- `npm audit --omit=dev`: **0 production dependency advisories** at audit time.
- Local PostgreSQL/RLS harness: **not run**; PostgreSQL command-line/server tools were unavailable.

No live database, production website, or external target was attacked or modified.
