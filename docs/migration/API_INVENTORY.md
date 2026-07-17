# BodyTune legacy API inventory

Status: Phase 1 repository audit

Source of truth reviewed: `backend/app/main.py` and `backend/app/api/v1/*.py`
Inventory date: 2026-07-18

## Reading this inventory

The access column describes what the FastAPI code currently enforces, not what the product should allow. `Optional bearer` means the route accepts an unauthenticated request and may also use a JWT when supplied. `Admin key` means the hard-coded/configured `X-ADMIN-KEY` bypass is accepted as an alternative to an admin JWT.

The legacy application exposes 66 explicit routes, in addition to FastAPI's generated OpenAPI and documentation routes.

## Health

| Method | Legacy endpoint | Current access | Frontend consumer | Express migration disposition |
| --- | --- | --- | --- | --- |
| GET | `/health` | Public | Topbar availability indicator | Keep as minimal liveness; add `/ready` for Mongo readiness and never return connection errors or credentials. |

## Authentication

| Method | Legacy endpoint | Current access | Frontend consumer | Express migration disposition |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | Public | Register page | Keep local registration only if local auth remains enabled; remove public admin-role registration. Create a server session only after verification. |
| POST | `/api/v1/auth/verify-otp` | Public | OTP page | Keep for local email verification/reset flows, but never authenticate a reset OTP. Hash challenges, cap attempts, and regenerate the session after successful account verification. |
| POST | `/api/v1/auth/resend-otp` | Public | OTP page | Keep with generic responses and strict IP/email/purpose limits. |
| POST | `/api/v1/auth/login` | Public | Login/admin-login pages | Preserve for local accounts and return the authenticated user in a session-backed response; do not return a bearer token. |
| POST | `/api/v1/auth/forgot-password` | Public | Forgot-password page | Preserve with non-enumerating response and throttled, hashed reset challenge. |
| POST | `/api/v1/auth/reset-password` | Public | Reset-password page | Preserve; invalidate all existing sessions/session version after success. |
| GET | `/api/v1/auth/me` | Bearer JWT | Auth provider | Preserve path and switch to session auth. Return the safe user projection only. |

Required new session/OAuth routes:

| Method | Proposed endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/auth/google` | Public | Start Passport Google OAuth with state and an allowlisted return target held in the session. |
| GET | `/api/v1/auth/google/callback` | OAuth callback | Validate state, link/create the verified account, regenerate the session, and redirect without putting tokens or PII in the URL. |
| POST | `/api/v1/auth/logout` | Session | Destroy the server session and clear the cookie. |
| GET | `/api/v1/auth/csrf-token` | Session/anonymous session | Issue a CSRF token if token-based CSRF protection is selected for the deployment topology. |

## Profiles and users

| Method | Legacy endpoint | Current access | Frontend consumer | Express migration disposition |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/profiles` | Public | None found | Remove. Profile creation is part of account creation or `PATCH /profiles/me`. |
| GET | `/api/v1/profiles` | Public | None found | Remove from user API; expose paginated safe projections under admin RBAC only. |
| GET | `/api/v1/profiles/me` | Bearer JWT | Profile page | Keep with session auth. |
| PUT | `/api/v1/profiles/me` | Bearer JWT | Profile page | Keep compatibility, preferably support `PATCH`; derive identity from the session. |
| GET | `/api/v1/profiles/{profile_id}` | Public | None found | Remove or make admin-only; never expose arbitrary profiles publicly. |
| PUT | `/api/v1/profiles/{profile_id}` | Public | None found | Remove or make admin-only with an explicit audited permission. |
| DELETE | `/api/v1/profiles/{profile_id}` | Public | None found | Replace with an authenticated account-deletion workflow; do not allow arbitrary deletion. |

## Activity and dashboard

| Method | Legacy endpoint | Current access | Frontend consumer | Express migration disposition |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/activity/summary` | Bearer JWT | Streak cards | Keep with session auth. |
| GET | `/api/v1/activity/heatmap` | Bearer JWT | Activity heatmap | Keep with bounded `days`; calculate date keys in the user's configured timezone. |
| POST | `/api/v1/activity/record` | Bearer JWT | Activity service exposes it | Restrict or remove general client-controlled increments. Record trusted domain events server-side. |
| POST | `/api/v1/activity/video-watch` | Bearer JWT | Video watch page | Keep only with video existence/access checks and an idempotency/deduplication rule. |
| GET | `/api/v1/dashboard/summary` | Bearer JWT | Dashboard page | Keep with session auth and database-side aggregates/projections. |

## Workouts and results

| Method | Legacy endpoint | Current access | Frontend consumer | Express migration disposition |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/workouts/summary` | Bearer JWT | Workout selection page | Keep; paginate recent sessions separately if the summary grows. |
| POST | `/api/v1/results` | Optional bearer | Live workout hook | Keep path but require a session, remove `user_id` from trusted input, and support all four implemented exercises. |
| GET | `/api/v1/results` | Public | None found | Make admin-only and paginated, or remove. |
| GET | `/api/v1/results/user/{user_id}` | Public | None found | Remove from user API; use `/results/me`. |
| GET | `/api/v1/results/me` | Bearer JWT | Results page | Keep with session auth plus pagination/filtering. |
| GET | `/api/v1/results/{result_id}` | Public | None found | Require owner or admin. |
| DELETE | `/api/v1/results/{result_id}` | Public | None found | Require owner or admin; define whether deletion is hard or soft. |

## Recommendations

| Method | Legacy endpoint | Current access | Frontend consumer | Express migration disposition |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/recommendations` | Public | Live workout hook | Require a session and derive the user from the owned workout result; make generation idempotent. |
| GET | `/api/v1/recommendations` | Public | None found | Make admin-only and paginated, or remove. |
| GET | `/api/v1/recommendations/user/{user_id}` | Public | None found | Replace with `/recommendations/me`. |
| GET | `/api/v1/recommendations/{recommendation_id}` | Public | None found | Require owner or admin. |
| DELETE | `/api/v1/recommendations/{recommendation_id}` | Public | None found | Require owner or admin. |

## Nutrition, foods, and meal photos

| Method | Legacy endpoint | Current access | Frontend consumer | Express migration disposition |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/foods` | Public | Diet page | Keep public or session-authenticated with pagination and bounded projections. |
| GET | `/api/v1/foods/search` | Public | Diet page | Keep with indexed search, query length limits, pagination, and abuse limits. |
| POST | `/api/v1/diet/photos/upload` | Public | Diet page | Require a session; derive owner, stream/limit the upload, validate content, and use private object storage. |
| GET | `/api/v1/diet/photos/{photo_id}/suggestions` | Public | None found; browser classification is separate | Require owner/admin if retained. Do not expose storage paths. |
| POST | `/api/v1/diet/logs` | Optional bearer | Diet page | Require a session and remove `user_id` from trusted input. |
| DELETE | `/api/v1/diet/logs/{log_id}` | Public | Diet page | Require owner/admin. The current frontend's `user_id` query value is ignored by FastAPI and is not authorization. |
| GET | `/api/v1/diet/logs/user/{user_id}` | Public | Diet page | Replace frontend use with `/diet/logs/me`; keep arbitrary-user access admin-only if needed. |
| GET | `/api/v1/diet/summary/user/{user_id}` | Public | Diet page | Replace frontend use with `/diet/summary/me`. |

Proposed owner-scoped aliases may be added while retaining the old paths only for the controlled cutover window:

- `GET /api/v1/diet/logs/me`
- `GET /api/v1/diet/summary/me`

## Generated plans

| Method | Legacy endpoint | Current access | Frontend consumer | Express migration disposition |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/ai-plans/generate` | Bearer JWT | AI plan page | Keep with session auth, strict health disclaimer, generator versioning, and rate limits. |
| GET | `/api/v1/ai-plans` | Bearer JWT | AI plan page | Keep owner-scoped and paginated. |
| GET | `/api/v1/ai-plans/{plan_id}` | Bearer JWT + owner check | AI plan page | Keep owner-scoped. |
| DELETE | `/api/v1/ai-plans/{plan_id}` | Bearer JWT + owner check | AI plan page | Keep owner-scoped. |

The current implementation is a deterministic rules engine, not an external AI/LLM integration. The migrated contract should expose generator type/version honestly instead of implying an unverified model capability.

## Videos and subscriptions

| Method | Legacy endpoint | Current access | Frontend consumer | Express migration disposition |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/videos` | Optional bearer; accepts arbitrary `user_id` | Video library | Keep. Return metadata to anonymous/free users but never serialize a premium media URL without entitlement. Ignore caller-supplied identity. |
| GET | `/api/v1/videos/{video_id}` | Optional bearer; accepts arbitrary `user_id` | Video watch page | Keep. Determine entitlement from the session and return a short-lived signed URL only when authorized. |
| GET | `/api/v1/subscription/plans` | Public | Subscription page | Keep; return active public plans. |
| POST | `/api/v1/subscription/mock-purchase` | Optional bearer; arbitrary `user_id` | Subscription page | Remove from production. Replace with authenticated checkout creation and verified webhook activation. A dev-only fixture endpoint must be impossible to enable in production. |
| GET | `/api/v1/subscription/user/{user_id}` | Public | None found | Remove from user API or make admin-only. |
| GET | `/api/v1/subscription/me` | Bearer JWT | Library/subscription pages | Keep with session auth. |

## Administration

| Method | Legacy endpoint | Current access | Frontend consumer | Express migration disposition |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/summary` | Admin JWT | Admin panel | Keep with session RBAC and database-side counts. |
| GET | `/api/v1/admin/users` | Admin JWT | Admin panel | Keep, paginate, filter, and return a safe projection. |
| GET | `/api/v1/admin/settings` | Admin JWT | None found | Keep only non-secret operational status; never return raw driver errors. |
| POST | `/api/v1/admin/uploads/video` | Admin JWT | Admin panel | Keep with streamed, validated media handling and audit logging. |
| POST | `/api/v1/admin/uploads/thumbnail` | Admin JWT | Admin panel | Keep with content validation and audit logging. |
| POST | `/api/v1/admin/videos` | Admin JWT or admin key | Admin panel | Keep with session RBAC only; remove the header-key bypass. |
| GET | `/api/v1/admin/videos` | Admin JWT or admin key | Admin panel | Keep with session RBAC and pagination. |
| PUT | `/api/v1/admin/videos/{video_id}` | Admin JWT or admin key | Admin panel | Keep compatibility; prefer `PATCH` and validate allowed assignments. |
| DELETE | `/api/v1/admin/videos/{video_id}` | Admin JWT or admin key | Admin panel | Keep with audit logging and coordinated external-asset cleanup. |
| POST | `/api/v1/admin/plans` | Admin JWT or admin key | Admin panel | Keep with session RBAC only. Store money in minor units. |
| GET | `/api/v1/admin/plans` | Admin JWT or admin key | Admin panel | Keep with session RBAC and pagination. |
| PUT | `/api/v1/admin/plans/{plan_id}` | Admin JWT or admin key | Admin panel | Keep compatibility; prefer `PATCH`. Do not mutate historical purchase terms. |

## Optional Mongo sidecar routes

| Method | Legacy endpoint | Current access | Frontend consumer | Express migration disposition |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/mongo/videos` | Mongo enabled + admin JWT/admin key | None found | Retire. MongoDB becomes the primary video store, so duplicate sidecar routes are unnecessary. |
| POST | `/api/v1/mongo/videos` | Mongo enabled + admin JWT/admin key | None found | Retire in favor of `/admin/videos`. |
| PUT | `/api/v1/mongo/videos/{video_id}` | Mongo enabled + admin JWT/admin key | None found | Retire in favor of `/admin/videos/{id}`. |
| DELETE | `/api/v1/mongo/videos/{video_id}` | Mongo enabled + admin JWT/admin key | None found | Retire in favor of `/admin/videos/{id}`. |

## Wire compatibility rules for `/api/v1`

1. Keep the current endpoint paths and snake_case JSON fields where they are safe and actively used. Internal TypeScript may use camelCase, with explicit serializers at the API boundary.
2. Change identity fields from numeric IDs to MongoDB ObjectId strings in one coordinated frontend/backend slice. During data import, retain an indexed `legacy_id` for reconciliation, not for authorization.
3. The centralized frontend client should unwrap successful envelopes and map the standardized error shape. Pages should not know whether the backend is Python or Express during the cutover.
4. Switch the client from `Authorization: Bearer ...` and `credentials: "omit"` to credentialed cookie requests. Never expose session IDs, OAuth tokens, or admin keys to React.
5. Owner identity always comes from the session. A body, route, or query `user_id` is never accepted as proof of ownership.
6. Add pagination metadata to list responses. Compatibility endpoints may use conservative defaults, but unbounded reads must not remain.
7. Use contract tests against sanitized fixtures before each frontend feature is pointed at Express.

## Target response contracts

Envelope control fields use camelCase in the new Express API. Feature payload fields retain the safe, actively consumed snake_case names during compatibility migration and are mapped explicitly at the API boundary.

Successful object response:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "meta": {
    "requestId": "uuid"
  }
}
```

Successful list response:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": [],
  "meta": {
    "requestId": "uuid",
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0,
    "hasMore": false
  }
}
```

Error response:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "errors": [],
  "requestId": "uuid"
}
```

Authentication and authorization failures must remain generic. Production responses must not contain stack traces, exception class names, database driver messages, OAuth details, or sensitive field values.
