# BodyTune Node backend

Production-oriented Express 5 and TypeScript API for the BodyTune MERN migration. This
service is being built beside the legacy Python backend. The Python implementation remains
the reference until each feature passes its parity, security, data, and frontend cutover
gates.

## Runtime baseline

- Node.js 24 LTS (the package engine also permits newer supported Node releases)
- npm 11 or newer
- MongoDB 8 for local development and integration testing
- Express 5, Mongoose, Zod, Pino, Jest, ts-jest, and Supertest

The API listens on port `9000` by default. Liveness is available at `GET /health`; datastore
readiness is available at `GET /ready`. Product routes are versioned under `/api/v1`.

## Local setup

```bash
cp .env.example .env
npm install
npm run dev
```

Before starting the server, replace every placeholder needed by the enabled modules. Never use
the example session, OTP, OAuth, or media secrets outside an isolated local environment. Commit
the generated `package-lock.json`; clean and CI installs should use that lockfile.

Useful commands:

```bash
npm run dev
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:coverage
npm run build
npm start
```

`npm start` runs the compiled `dist/server.js`, so run `npm run build` first.

## Configuration

Environment variables are validated during startup. Invalid or missing required production
values must stop the process rather than falling back to a known secret.

| Variable                              | Purpose                                                                         | Local example/default                |
| ------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------ |
| `NODE_ENV`                            | `development`, `test`, or `production`                                          | `development`                        |
| `PORT`                                | HTTP listen port                                                                | `9000`                               |
| `MONGODB_URI`                         | MongoDB connection string; always secret in hosted environments                 | `mongodb://127.0.0.1:27017/bodytune` |
| `MONGODB_CONNECT_MAX_ATTEMPTS`        | Bounded initial connection attempts                                             | `5`                                  |
| `MONGODB_CONNECT_RETRY_DELAY_MS`      | Delay between initial connection attempts                                       | `2000`                               |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | Per-attempt server selection timeout                                            | `5000`                               |
| `MONGODB_MAX_POOL_SIZE`               | Maximum Mongoose connection pool size                                           | `10`                                 |
| `CORS_ORIGINS`                        | Comma-separated exact browser origins; wildcards are forbidden with credentials | `http://localhost:5173`              |
| `TRUST_PROXY`                         | Express proxy trust setting; configure for the actual edge topology             | `false`                              |
| `LOG_LEVEL`                           | Pino log level                                                                  | `debug`                              |
| `REQUEST_BODY_LIMIT`                  | Express JSON and form-body limit                                                | `100kb`                              |
| `GLOBAL_RATE_LIMIT_WINDOW_MS`         | General API limiter window                                                      | `900000`                             |
| `GLOBAL_RATE_LIMIT_MAX`               | Requests allowed per general limiter window                                     | `300`                                |
| `SHUTDOWN_TIMEOUT_MS`                 | Maximum graceful-shutdown interval                                              | `10000`                              |
| `API_DOCS_ENABLED`                    | Enables development API documentation when supported                            | `true`                               |

`.env.example` also records the target session, Google OAuth, local recovery, private-media,
and disabled-payment settings. Those values become mandatory only when the corresponding module
is enabled. Production deployments should inject secrets through their secret manager, not an
image or committed environment file.

## Modular feature-layered architecture

Each business capability owns its HTTP-to-persistence path:

```text
src/modules/<feature>/
  <feature>.routes.ts       endpoint composition and middleware order
  <feature>.controller.ts   HTTP input/output translation
  <feature>.validation.ts   Zod request and service-input schemas
  <feature>.service.ts      business rules, authorization invariants, transactions
  <feature>.repository.ts   bounded MongoDB queries and safe projections
  <feature>.model.ts        typed Mongoose schema and indexes
  <feature>.types.ts        feature-owned types and contracts
  <feature>.test.ts         colocated unit/contract coverage when appropriate
```

Controllers stay thin. Services do not depend on Express objects. Repositories do not make
authorization decisions, but receive already-authorized scope and still constrain ownership in
their queries. Cross-cutting configuration, errors, middleware, and small utilities remain under
`config/`, `errors/`, `middlewares/`, and `shared/`; they must not absorb feature business logic.

The intended request flow is:

```text
route -> validation/auth middleware -> controller -> service -> repository -> Mongoose model
```

## API contract

Success responses use:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "meta": { "requestId": "01J..." }
}
```

Errors use:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "errors": [],
  "requestId": "01J..."
}
```

The starter OpenAPI 3.1 document is in `docs/openapi.yaml`. Update it in the same change as every
new route or contract modification.

## Tests

Unit and HTTP tests run with Jest and Supertest. Integration tests must use a dedicated test
database and must never reuse development or production data. Set a test-only `MONGODB_URI` in
the test harness, create unique database names per worker where parallelism is enabled, and clean
only that verified database.

Before a feature is marked migrated, run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
```

Coverage is reported in text, LCOV, and JSON-summary formats. A ratcheted coverage threshold
should be approved before the first domain slice; coverage percentage does not replace explicit
authorization, IDOR, validation, boundary, and failure-path tests.

## Containers

Copy and review the environment file, then start the API and a local MongoDB instance:

```bash
cp .env.example .env
docker compose up --build
```

MongoDB is bound to loopback for local tooling. The API container uses the internal `mongo`
hostname and exposes port 9000. The Compose file is a local/developer baseline, not a complete
production platform definition; production needs managed secrets, TLS at the edge, backups,
monitoring, private networking, and an approved MongoDB deployment.

## Data migration and operational safety

Legacy migration and seed scripts are explicit commands and must never run on application
startup:

```bash
npm run seed
npm run migrate:legacy -- --dry-run
```

Do not treat committed SQLite artifacts as authoritative data. Do not copy databases, dumps,
journals, OAuth tokens, session cookies, OTPs, password hashes, or private media into this folder
or a container image. The migration command must remain dry-run capable, idempotent where
practical, and free of personal or secret values in logs.

The server handles `SIGTERM`/`SIGINT` by stopping new HTTP work, draining existing requests within
the configured timeout, and closing MongoDB and other resources. Liveness reports only process
health; readiness reports dependency availability and must return a non-success status when the
service should not receive traffic.
