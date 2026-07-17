# BodyTune Python-to-Express migration checklist

Status: Phase 1 repository audit complete; migration implementation not started

Checklist date: 2026-07-18

Working branch: `feat/express-backend-migration`
Companion documents: [migration report](./MIGRATION_REPORT.md) and [legacy API inventory](./API_INVENTORY.md)

## How to use this checklist

- `[x]` means the audit/documentation activity was completed and verified during Phase 1.
- `[ ]` means the activity is not complete. No unchecked implementation item should be read as partially delivered.
- Every gate needs an owner, evidence link, completion date, and reviewer before the following phase starts.
- Keep the FastAPI application intact and runnable as the behavioral reference until the final archival gate passes.
- Implement one vertical slice at a time. Do not combine unrelated cleanup with a feature migration.
- Do not push directly to `main`, force-push, rewrite shared history, or delete the legacy backend as part of this plan.

## Current status: Phase 1 audit and planning

- [x] Create the safety branch `feat/express-backend-migration`.
- [x] Confirm the initial worktree was clean and `origin/main` matched the single local commit.
- [x] Review all tracked backend, frontend, configuration, test, and documentation files.
- [x] Document product behavior, user/admin roles, frontend pages, browser inference, and external integrations.
- [x] Inventory the 66 explicit FastAPI routes and record a keep, replace, restrict, or retire disposition.
- [x] Inventory SQLAlchemy/SQLite models and the optional MongoDB sidecar.
- [x] Map frontend API consumers, authentication assumptions, numeric ID assumptions, and response-shape dependencies.
- [x] Inspect the tracked SQLite backup with aggregate/schema queries only; do not reproduce sensitive values.
- [x] Record the existing test/build limitations: dependencies are absent, Python tests cannot currently run, and no verified green repository baseline exists.
- [x] Document the target architecture, security posture, persistence model, migration sequence, and cutover strategy.
- [x] Preserve the Python implementation; no Express migration code was created in Phase 1.
- [ ] Product, engineering, security, and operations owners approve the migration report and this checklist.
- [ ] Record approval evidence and decision owners in an ADR or project tracker before implementation begins.

Phase 1 exit gate: the audit artifacts have been presented, all blocking decisions below are resolved, and implementation is explicitly authorized.

## Gate 0: repository data exposure and immediate containment

Treat the tracked SQLite backup and rollback journals as a potential security/data incident until the responsible owner classifies them. They contain account records, password hashes, and plaintext OTP rows. Do not copy raw values into logs, tickets, test fixtures, commits, or migration reports.

- [ ] Identify the data owner and determine whether the tracked database contains real, test, or mixed user data.
- [ ] Determine repository visibility, collaborator access, forks, mirrors, CI caches, release artifacts, and downloaded clones.
- [ ] Pause production use of the affected snapshot and preserve only the minimum evidence required by the incident process.
- [ ] Invalidate all passwords represented in the snapshot and require verified password reset or verified Google account linking before access.
- [ ] Manually validate every legacy admin account before restoring an admin role; never infer trust solely from the imported role value.
- [ ] Invalidate and purge every legacy OTP. OTP records must never be imported into MongoDB.
- [ ] Rotate any JWT, admin-key, SMTP, ImageKit, database, OAuth, or other credentials that may have been used with this repository or exposed through unsafe defaults.
- [ ] Remove the database backup and rollback journals from the tracked tree in a normal reviewed commit, and add precise ignore rules that do not hide required migration fixtures.
- [ ] Replace production-like data with generated, sanitized fixtures containing no user-derived identifiers or secrets.
- [ ] Decide whether Git-history remediation is required with security/legal owners. A history rewrite would require explicit authorization and coordinated handling because the project rules prohibit force-pushing; do not perform it automatically.
- [ ] If history cannot be rewritten, document the residual exposure, repository-access controls, credential invalidation, and user/legal notification decision.
- [ ] Open and close an incident record with scope, timeline, containment evidence, remediation, and follow-up owners.

Gate 0 exit: exposed credentials and account access are invalidated, affected data is contained, administrators are reviewed, and residual repository-history risk is formally accepted or remediated.

## Gate 1: blocking product and architecture decisions

Record each decision in an ADR before scaffolding the replacement backend.

- [ ] Select the authoritative source dataset: the configured runtime database is absent, while the tracked backup is legacy and does not match the current schema.
- [ ] Decide whether legacy product records will be imported, partially imported, or discarded with informed owner approval.
- [ ] Select the deployment topology and exact frontend/backend origins. Prefer same-origin reverse proxying for cookie sessions.
- [ ] Define development, staging, and production domains, TLS enforcement, trusted proxies, CORS allowlists, and cookie names.
- [ ] Decide whether local email/password login remains supported alongside Google OAuth or whether the product becomes Google-only.
- [ ] Define verified-email account linking, duplicate-account handling, provider unlinking, account recovery, and takeover protections.
- [ ] Choose the transactional email provider and sender-domain configuration for verification/reset flows.
- [ ] Choose the private object-storage/media provider and retention/deletion policy for meal photos, videos, and thumbnails.
- [ ] Choose the payment provider, supported currency/countries, plan semantics, refunds/cancellations, webhook contract, and entitlement rules. Until selected, paid activation stays disabled outside local fixtures.
- [ ] Decide whether the deterministic plan generator remains branded as “AI,” and approve its health disclaimer, sensitive-input policy, and product claims.
- [ ] Approve the canonical fitness-goal and exercise-type taxonomies shared by the profile, live workout, result, and plan flows.
- [ ] Define the user's canonical timezone, daily-boundary behavior, data-retention periods, account deletion, export, and consent requirements.
- [ ] Define migration recovery point/recovery time objectives and choose a write-path rollback strategy: maintenance window, reversible event/outbox replay, or another proven mechanism.
- [ ] Decide the production cutover owner, incident commander, go/no-go reviewers, rollback authority, and maintenance communications.

Gate 1 exit: every decision has an approved owner/date, no production behavior depends on a mock provider or unknown origin, and the implementation sequence is authorized.

## Phase 2: establish a reproducible baseline

- [ ] Pin and document supported Node.js LTS, npm, Python, and database versions.
- [ ] Install frontend and legacy-backend dependencies from locked manifests in a clean environment.
- [ ] Add or repair deterministic dependency lockfiles without silently upgrading unrelated packages.
- [ ] Run the complete Python suite and record pass/fail/skipped counts.
- [ ] Run frontend TypeScript checking and a production Vite build.
- [ ] Capture sanitized legacy API contract fixtures for all actively consumed routes.
- [ ] Capture representative UI smoke flows without storing tokens, email addresses, photos, or health notes.
- [ ] Triage baseline failures separately from migration regressions.
- [ ] Record the accepted baseline commit and evidence in the migration report.

Phase 2 exit: the reference backend and frontend have reproducible commands, known baseline results, and sanitized contract fixtures.

## Phase 3: scaffold `backend-node/` without changing product traffic

- [ ] Create `backend-node/` beside the untouched Python backend.
- [ ] Configure strict TypeScript, Express, Mongoose, Vitest/Jest or an approved equivalent, Supertest, ESLint, Prettier, and coverage scripts.
- [ ] Establish `src/app.ts` as the testable app factory and `src/server.ts` as the process entry point.
- [ ] Organize feature modules for auth, users/profiles, activity, workouts/results, recommendations, nutrition, plans, videos, subscriptions, admin, and health.
- [ ] Keep controllers thin; place domain logic in services and persistence concerns in repositories/models.
- [ ] Add schema validation for environment variables at startup and fail closed on missing production secrets.
- [ ] Add MongoDB connection retry policy, readiness state, timeouts, graceful shutdown, and deterministic test database isolation.
- [ ] Add request IDs, structured Pino logging, redaction, typed operational errors, a not-found handler, and a centralized error handler.
- [ ] Add Helmet, CORS allowlists, HPP/query hardening, bounded JSON/form bodies, upload limits, and trusted-proxy configuration.
- [ ] Add route-specific and global rate limiting, with stricter policies for login, OAuth, OTP, reset, uploads, search, and plan generation.
- [ ] Define standard object/list/error envelopes and explicit serializers that preserve safe `/api/v1` snake_case compatibility.
- [ ] Add `/health` liveness and `/ready` dependency readiness without exposing driver details.
- [ ] Add an initial OpenAPI document and generate/validate TypeScript contract types where practical.
- [ ] Prove a clean start, health request, shutdown, and failing-readiness integration test before feature code begins.

Phase 3 exit: the service foundation passes lint, typecheck, unit/integration tests, production build, and local container smoke checks while receiving no product traffic.

## Phase 4: define MongoDB collections and indexes

- [ ] Define `User` with normalized unique email, provider identities, optional hidden password hash, role/status, email verification, embedded one-to-one profile/nutrition goals, timezone, session version, and unique nullable `legacy_id`.
- [ ] Store sessions in a dedicated Mongo-backed session collection with an expiry/TTL index.
- [ ] Define hashed/HMAC-protected `OtpChallenge` records with purpose, attempt count, expiry TTL, consumption state, and no recoverable OTP value.
- [ ] Define `WorkoutResult` and `Recommendation` ownership, indexes, generator/rule version, and result-to-recommendation idempotency.
- [ ] Define `FoodItem` with normalized search fields, source, owner, nutrient values, aliases, and partial uniqueness for system versus user-created foods.
- [ ] Define private `MealAsset` metadata and `DietLog` nutrient/name snapshots with owner/date indexes.
- [ ] Define atomic `ActivityDaily` counters keyed by user, timezone/date key, and a unique compound index; add allowlisted `ActivityEvent` only if analytics/audit needs it.
- [ ] Define `GeneratedPlan` with minimized/versioned inputs, risk flags, output, generator type/version, and no raw medical free text by default.
- [ ] Define `Video` with storage metadata, premium flag, active state, and a serializer that can never leak a premium media URL without entitlement.
- [ ] Define `SubscriptionPlan`, `Subscription`, and `PaymentWebhookEvent` with money in minor units, period snapshots, provider IDs, entitlement state, and idempotency indexes.
- [ ] Define immutable security/admin `AuditEvent` records and a `MigrationRun` manifest without sensitive payloads.
- [ ] Review every schema for required/optional/null behavior, enum compatibility, timestamps, soft/hard deletion, retention, and least-data storage.
- [ ] Verify all required unique, compound, partial, text/search, and TTL indexes in an integration test.

Phase 4 exit: schemas, indexes, retention behavior, and safe projections are reviewed before any route can persist data.

## Phase 5: identity, sessions, Google OAuth, and profiles

- [ ] Configure `express-session` with `connect-mongo`; store only the user identifier and minimum state in the session.
- [ ] Use a production cookie with `Secure`, `HttpOnly`, `Path=/`, no `Domain`, an approved `SameSite` value, rotation-ready secrets, and an environment-safe name such as `__Host-...` where topology permits.
- [ ] Regenerate the session on login/OAuth completion and destroy it on logout.
- [ ] Invalidate sessions after password reset, role/status change, suspected compromise, and account deletion using session versioning or equivalent revocation.
- [ ] Implement Passport Google OAuth 2.0 with state validation, verified-email handling, allowlisted return targets stored in the session, and no tokens/PII in redirect URLs.
- [ ] Implement reviewed account-linking rules that do not auto-merge an unverified or conflicting identity.
- [ ] If local auth remains, use a modern password hash configuration and a transparent upgrade policy for approved non-exposed legacy hashes.
- [ ] Split registration verification and password-reset purposes; a reset challenge must never create an authenticated session.
- [ ] Hash OTP challenges with a server-side pepper, cap attempts, throttle by IP/email/purpose, consume atomically, and return non-enumerating responses.
- [ ] Remove public admin registration and the `X-ADMIN-KEY` bypass; establish a controlled, audited admin bootstrap/role process.
- [ ] Implement CSRF protection appropriate to the chosen topology, including Origin/Referer validation and an explicit token mechanism where required.
- [ ] Implement session-authenticated `/auth/me`, `/auth/logout`, Google start/callback, approved local auth routes, and owner-scoped `/profiles/me`.
- [ ] Reject suspended/deleted users and re-check server-side roles for every privileged request.
- [ ] Add unit/integration/security tests for fixation, CSRF, OAuth state, open redirect, account linking, enumeration, brute force, OTP replay, session expiry, logout, and role changes.

Phase 5 exit: identity is server-derived, sessions are revocable, every auth abuse case is tested, and no bearer token or admin key is required by React.

## Phase 6: migrate vertical product slices in dependency order

Use the per-slice delivery gate below for every numbered slice. A later slice may not consume an earlier slice until its gate is green.

### Slice 1: workout results and recommendations

- [ ] Support squat, push-up, crunch, and bicep curl consistently across validation, persistence, summaries, and recommendations.
- [ ] Derive ownership from the session; remove trusted `user_id` input and close every public result/recommendation IDOR.
- [ ] Persist the result and generate/attach its recommendation transactionally or with an idempotent recoverable workflow.
- [ ] Add pagination/filtering, owner/admin read/delete policies, stable snapshots, and indexes.
- [ ] Preserve browser-side pose inference; no camera frames or landmarks are sent to the backend without a separately approved requirement.

### Slice 2: food catalog, meal assets, and diet logs

- [ ] Implement indexed, bounded, paginated food search and safe system/custom-food uniqueness rules.
- [ ] Derive diet-log and asset ownership from the session and close arbitrary-user reads, writes, and deletes.
- [ ] Stream uploads with size/content validation, malware policy, private storage, signed access, retention, and coordinated deletion.
- [ ] Store a nutrient/name snapshot on each diet log so historical totals do not change when catalog items change.
- [ ] Make upload-plus-log behavior recoverable so failures do not leave unmanaged assets.
- [ ] Calculate daily totals in the user's timezone and align UI labels with the actual time window.

### Slice 3: generated fitness/nutrition plans

- [ ] Port the existing deterministic rules with characterization tests before refactoring behavior.
- [ ] Version rules and output; label the generator accurately and preserve safety notes.
- [ ] Normalize goal taxonomy, actually implement or remove unused budget input, and minimize allergy/injury/medical free text.
- [ ] Add rate limits, input bounds, owner-scoped history, pagination, deletion policy, and PDF regression checks.
- [ ] Enable “Save” only when persistence semantics are implemented and tested.

### Slice 4: videos, media entitlement, and subscriptions

- [ ] Store only private provider keys/metadata; return short-lived signed media only after server-side entitlement checks.
- [ ] Ensure free/anonymous responses never contain a premium URL, including nested objects, logs, errors, or preload metadata.
- [ ] Make watch activity contingent on authorized playback/progress and deduplicate repeated page loads.
- [ ] Coordinate video/thumbnail replacement and deletion with provider cleanup and retryable jobs.
- [ ] Keep production purchase activation disabled until provider checkout and signed webhook verification are implemented.
- [ ] Add webhook replay protection/idempotency, amount/currency/plan verification, lifecycle events, refunds/cancellations, and immutable purchase-term snapshots.
- [ ] Correct legacy records marked active after expiry during approved data migration; do not grant entitlement from stale status alone.

### Slice 5: activity and streaks

- [ ] Replace read-modify-write increments with atomic upserts keyed by user and timezone date.
- [ ] Emit activity from trusted workout, diet, and authorized video events; restrict or remove generic client-controlled increments.
- [ ] Define deduplication/idempotency for repeated requests and retries.
- [ ] Test daylight-saving/timezone changes, consecutive days, gaps, late events, and concurrent writes.

### Slice 6: dashboard and administration

- [ ] Build dashboard summaries from bounded database aggregations after all source modules are stable.
- [ ] Implement admin summary/users/videos/plans with session RBAC, safe projections, pagination, filters, and audit events.
- [ ] Never serialize password hashes, OAuth tokens, session data, OTPs, raw provider errors, sensitive health notes, or private media keys.
- [ ] Split or simplify the admin page only when needed for maintainability; preserve existing loading/error/empty behavior.
- [ ] Retire the disconnected `/mongo/*` video routes and duplicated stores.

## Per-slice delivery gate

Repeat and attach evidence for each vertical slice:

- [ ] Approve the route disposition and request/response contract before coding.
- [ ] Implement schema/index, validator, repository, service, controller, route, serializer, and error mapping.
- [ ] Add explicit session, role, ownership, field allowlist, rate-limit, and idempotency rules.
- [ ] Add unit tests for domain logic and failure paths.
- [ ] Add Mongo integration tests for indexes, concurrency, transactions/idempotency, and persistence errors.
- [ ] Add Supertest contract tests for success, validation, authentication, authorization, not-found, conflict, and rate-limit responses.
- [ ] Add negative security tests using another user's ID/object ID, forged role/user fields, malformed IDs, query-operator injection, oversized input, duplicate requests, and unauthorized media access.
- [ ] Run Python characterization fixtures and compare only intentionally changed behavior.
- [ ] Update the centralized frontend client/types behind a reversible feature or routing flag.
- [ ] Exercise frontend loading, error, empty, success, retry, and session-expiry states.
- [ ] Run backend lint, formatting check, typecheck, unit/integration/contract tests, coverage gate, and production build.
- [ ] Run frontend lint when added, typecheck, unit/component tests, and production build.
- [ ] Perform a manual least-privilege smoke test with separate anonymous, user A, user B, and admin sessions.
- [ ] Review the diff for secrets, personal data, generated artifacts, dependency drift, unsafe defaults, and unrelated changes.
- [ ] Update OpenAPI, the route inventory, migration checklist, risk register, and operational notes.
- [ ] Commit the single slice with a conventional commit only after all relevant checks pass.
- [ ] Push the feature branch without force and record CI evidence; do not merge while any required gate is red.

## Phase 7: coordinated frontend session and API cutover

- [ ] Change all identifier types from `number` to opaque strings and remove conversions such as `Number(selectedFoodId)`.
- [ ] Update the centralized API client to use `credentials: "include"`, standardized envelopes/errors, request IDs, timeout/abort behavior, and CSRF tokens where required.
- [ ] Remove bearer `Authorization` construction, `localStorage` JWT persistence, and all `VITE_ADMIN_KEY` code/configuration.
- [ ] Bootstrap auth with `/auth/me` even when no local token exists, and handle anonymous, expired, suspended, and network-error states distinctly.
- [ ] Add logout, Google sign-in, safe post-login return routing, callback failure UI, and session-expiry recovery.
- [ ] Keep OAuth/session/provider errors generic and never place tokens or personal data in browser URLs, storage, telemetry, or console logs.
- [ ] Preserve the existing UI, loading/error/empty states, and public routes during API replacement.
- [ ] Carry the selected workout type into `/workouts/live` and persist all four supported exercises.
- [ ] Pin browser inference assets/models, add CSP-compatible hosting, throttle processing, and present a usable camera/model failure path.
- [ ] Use profile nutrition goals instead of hardcoded diet goals; cancel stale food searches and clear/reconcile uploaded assets after completion/failure.
- [ ] Populate plan defaults from the profile and align goal enums across profile and plan forms.
- [ ] Record video activity from actual authorized playback/progress rather than detail-page load.
- [ ] Make independent page panels resilient so one failed aggregate request does not hide unrelated successful content.
- [ ] Add a catch-all 404 route, correct successful non-`ok` health rendering, fix the landing mobile menu/anchors, and remove or substantiate unsupported marketing claims.
- [ ] Add accessible live-region behavior for toasts and keyboard/focus checks for new auth flows.
- [ ] Verify SPA rewrite configuration for direct navigation and OAuth return paths.
- [ ] Cut over one feature flag/route group at a time and retain the matching legacy client path until that slice completes its soak period.

Phase 7 exit: no browser secret or bearer token remains, authenticated requests use the approved session/CSRF design, and every migrated page passes contract and UI checks.

## Phase 8: data migration tooling and rehearsal

### Source preparation

- [ ] Obtain an authorized, immutable source snapshot outside Git and record a cryptographic checksum, schema version, capture time, and custodian.
- [ ] Re-capture aggregate counts at migration time; do not assume the Phase 1 audit counts are the cutover counts.
- [ ] Detect optional/missing tables and columns rather than assuming the current ORM schema matches the backup.
- [ ] Resolve duplicate emails, missing profiles, orphaned relationships, invalid enums/dates, missing media, stale subscriptions, and inconsistent IDs through an approved exception manifest.
- [ ] Never place the source database, migration maps, raw rejected rows, or personal values in Git or CI artifacts.

Phase 1 aggregate evidence for planning only: 11 auth users, 2 profiles, 2 activity logs, 184 foods, 1 diet log, 5 meal-photo records, 3 workout results, 3 recommendations, 3 subscription plans, 5 subscriptions, 6 videos, and 16 plaintext OTP records. The backup has no `ai_plans` table. These are not accepted cutover totals until re-captured and signed off.

### Idempotent import

- [ ] Build a dry-run-first TypeScript migration CLI with explicit source/target arguments, no production defaults, structured redacted output, and a unique `MigrationRun` ID.
- [ ] Make reruns idempotent through unique `legacy_id` mappings and deterministic upsert/skip rules; never use caller-controlled legacy IDs for authorization.
- [ ] Import verified users and embedded profiles first; mark all exposed-password accounts for reset and map admin roles only from the approved admin manifest.
- [ ] Import foods/plans/catalog records before dependent user records.
- [ ] Import workout results and recommendations with validated ownership and relationship mappings.
- [ ] Import diet logs and meal metadata only when ownership is provable; quarantine missing/inaccessible assets rather than publishing broken paths.
- [ ] Import activity into canonical timezone-aware daily keys using an approved fallback when timezone is absent.
- [ ] Import videos only after provider objects are reconciled; all six audited local video paths and all five meal-photo paths were missing from the checkout and must not be treated as valid assets.
- [ ] Recalculate subscription entitlement from verified periods/provider evidence; do not import an expired record as active merely because its status says active.
- [ ] Do not import OTP challenges, bearer tokens, sessions, password-reset state, admin keys, raw medical notes, or unavailable local file paths.
- [ ] Emit a redacted accepted/rejected/repaired summary and require manual sign-off for every exception category.

### Reconciliation and acceptance

- [ ] Compare source, accepted, rejected, repaired, and target counts per entity, with every difference explained.
- [ ] Verify unique email/provider/legacy mappings, ownership references, recommendation-result links, and absence of orphans.
- [ ] Verify nutrition totals, workout aggregates, activity streaks, dates/timezones, money in minor units, subscription periods, and entitlements using sampled sanitized cases.
- [ ] Verify all indexes exist and query plans use the expected indexes for common/list/admin paths.
- [ ] Verify no plaintext OTP, exposed password hash, JWT, session, admin key, raw provider error, private path, or unapproved sensitive text exists in target documents/logs.
- [ ] Run route-level contract and authorization tests against the migrated staging dataset.
- [ ] Record checksum, tool version, run ID, duration, reconciliation report, approvers, and unresolved exceptions.
- [ ] Repeat the full migration rehearsal from a clean target until results are deterministic and all acceptance checks pass.

Phase 8 exit: an authorized snapshot can be imported repeatedly, every discrepancy is explained, security invariants pass, and the production runbook has been rehearsed.

## Phase 9: production cutover and rollback

### Pre-cutover

- [ ] Complete security review/threat model, dependency/secret/container scans, load testing, backup restore test, and disaster-recovery rehearsal.
- [ ] Verify OAuth, email, media, payment webhooks, DNS/TLS, cookies, CORS/CSRF, proxy trust, alerting, dashboards, and on-call access in production configuration.
- [ ] Freeze schema/API changes and communicate the maintenance/cutover window.
- [ ] Take and verify restorable SQLite and MongoDB backups immediately before migration.
- [ ] Tag the accepted Python/frontend/reference commits and record deploy artifact digests.
- [ ] Confirm the matching legacy frontend build remains deployable because session-cookie and bearer-token clients are not interchangeable.
- [ ] Confirm the chosen strategy can preserve or replay writes made after cutover; rollback must not silently discard MongoDB writes.

### Cutover

- [ ] Enter the approved write freeze or enable the proven write-replay strategy.
- [ ] Run the signed migration artifact with a unique production run ID.
- [ ] Reconcile counts, relationships, entitlements, security invariants, and representative user/admin journeys.
- [ ] Route a controlled canary to Express and watch auth errors, authorization denials, latency, error rate, MongoDB health, media failures, webhook failures, and business counters.
- [ ] Expand traffic only when the go/no-go reviewers sign each canary step.
- [ ] End the write freeze only after reconciliation and smoke checks pass.
- [ ] Preserve the source snapshot, migration manifest, and rollback artifacts according to the approved retention policy.

### Rollback

- [ ] Define objective rollback triggers for authentication failure, data mismatch, entitlement leakage, elevated errors/latency, or observability loss.
- [ ] Stop/contain new Express writes and capture the exact rollback boundary.
- [ ] Route traffic to the matching legacy backend and matching bearer-token frontend artifact, not a session-only frontend.
- [ ] Replay or reconcile post-cutover writes according to the approved recovery design; never discard them silently.
- [ ] Invalidate incompatible sessions/cookies safely and require re-authentication where necessary.
- [ ] Re-run core user/admin smoke tests and data checks after rollback.
- [ ] Communicate status, preserve evidence, open an incident, and block another cutover until root cause and reconciliation are approved.
- [ ] Rehearse this rollback end-to-end before production and attach timing/RPO/RTO evidence.

Phase 9 exit: Express is the accepted system of record, the cutover has passed its agreed soak period, and rollback remains available until explicitly retired.

## Phase 10: CI, containers, documentation, and operations

### CI and quality gates

- [ ] Add CI for locked dependency installation, formatting, lint, strict typecheck, unit/integration/contract tests, coverage thresholds, production builds, and migration dry-run fixtures.
- [ ] Add dependency vulnerability, license-policy, secret, and container-image scans with reviewed failure policies.
- [ ] Run MongoDB-backed integration tests in isolated CI services and prevent accidental external/production connections.
- [ ] Add frontend unit/component tests and high-value end-to-end flows for local/Google auth, workout save, diet log, plan generation, premium denial/grant, admin RBAC, and logout.
- [ ] Protect `main` with required reviews and green checks; retain conventional, focused commits and no force pushes.

### Docker and deployment

- [ ] Add a multi-stage, non-root backend Dockerfile with pinned runtime base, production-only dependencies, health check, signal handling, and no baked-in secrets.
- [ ] Add local development composition for Express/MongoDB without production credentials or tracked database volumes.
- [ ] Add `.dockerignore`, bounded writable paths, read-only filesystem where practical, and container resource/timeout settings.
- [ ] Document reverse proxy, TLS, headers, body limits, static SPA rewrites, OAuth callback, and graceful deployment behavior.
- [ ] Validate startup failure on missing/unsafe production configuration and successful zero/low-downtime shutdown.

### Documentation

- [ ] Update the root README with local development, test, build, seed, migration, and troubleshooting commands.
- [ ] Add safe `.env.example` files with descriptions/placeholders only and document environment-specific validation.
- [ ] Maintain OpenAPI, response/error conventions, auth/session/CSRF behavior, pagination, rate limits, webhook signatures, and deprecation dates.
- [ ] Add architecture/data-flow diagrams, schema/index documentation, ADRs, and a feature parity matrix.
- [ ] Add runbooks for deploy, rollback, backups/restores, credential rotation, user/session invalidation, OAuth/email/media/payment failures, and incident response.
- [ ] Document the deterministic plan engine, its limitations, health disclaimer, model/rule version, privacy behavior, and non-medical scope.

### Observability and operational security

- [ ] Emit structured JSON logs with request IDs and redaction for authorization/cookie/set-cookie headers, passwords, OTPs, OAuth values, admin fields, provider secrets, email addresses, and health/medical inputs.
- [ ] Add metrics for request rate/latency/errors, auth/OTP/rate-limit outcomes, MongoDB pool/operations, uploads, external-provider failures, webhook lag/replay, migration outcomes, and business flow success.
- [ ] Add traces only with approved low-cardinality, non-PII attributes.
- [ ] Add immutable audit events for role changes, account status, video/plan mutations, subscription changes, migration execution, and privileged data access.
- [ ] Configure actionable alerts, dashboards, ownership, escalation, retention, and alert drills.
- [ ] Keep liveness independent of dependencies; require MongoDB and essential configuration for readiness.

Phase 10 exit: every deployment is reproducible, observable, supportable, security-scanned, and documented without exposing secrets or personal data.

## Final gate: parity and Python archival

Do not begin this section merely because Express is deployed. Complete it only after the approved soak period and a formal parity review.

- [ ] Reconcile all 66 legacy route dispositions: migrated, intentionally changed, restricted, or retired with consumer evidence.
- [ ] Confirm all frontend pages and admin workflows use Express and no production traffic, scheduled work, scripts, or integrations call FastAPI.
- [ ] Confirm auth, authorization, premium entitlement, payment, upload, deletion, retention, and account lifecycle threat-model findings are closed.
- [ ] Confirm data reconciliation, backup restore, migration rerun, cutover, and rollback evidence is approved.
- [ ] Confirm performance/load objectives, error budgets, alerting, and on-call runbooks pass under expected traffic.
- [ ] Confirm no required behavior depends on the optional Mongo sidecar, public uploads, SQLite, SMTP defaults, static admin key, JWT/localStorage, or mock purchase route.
- [ ] Obtain product, engineering, security, data, and operations sign-off on the parity matrix.
- [ ] Tag the final reference Python release and retain it according to the approved source/archive policy.
- [ ] Archive the Python backend in a clearly named legacy location or external archive only after sign-off; do not delete historical evidence or source snapshots contrary to retention requirements.
- [ ] Remove Python runtime/dependencies/deployment configuration in a separate reviewed commit.
- [ ] Rename `backend-node/` to `backend/` only after archival and update all CI, Docker, docs, paths, ownership, and deployment references.
- [ ] Run the entire backend/frontend/security/migration test matrix again after the rename and perform a clean production build/deploy rehearsal.
- [ ] Close the migration only after post-rename checks and the final rollback/retention decision are recorded.

## Definition of done

The migration is done only when Express/TypeScript/MongoDB is the verified system of record; Google OAuth and optional local auth use revocable secure sessions; ownership/RBAC and premium media are enforced server-side; exposed legacy credentials/data are remediated; data is reconciled with a rehearsed rollback; CI, containers, logs, metrics, alerts, tests, and documentation are operational; the React UI has completed its session/API cutover; and the Python backend has been archived only after approved parity.
