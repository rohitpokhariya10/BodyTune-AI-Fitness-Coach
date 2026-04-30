# MongoDB Setup

MongoDB is optional in this backend. SQLite and SQLAlchemy remain the primary
storage layer for auth, profiles, diet, workouts, videos, subscriptions, and the
dashboard.

## 1. Local MongoDB Setup

Install MongoDB Community Server, then start the local service. The default URI
used by this app is:

```env
MONGO_URI="mongodb://localhost:27017"
```

Create a database name for the app:

```env
MONGO_DB_NAME="ai_fitness_coach"
```

MongoDB will create collections automatically when the app first writes data.

## 2. MongoDB Atlas Setup

Create an Atlas cluster, add a database user, and allow your IP address in
Network Access. Use an SRV connection string like:

```env
MONGO_URI="mongodb+srv://<username>:<password>@<cluster-url>/ai_fitness_coach"
MONGO_DB_NAME="ai_fitness_coach"
```

Keep the URI in `.env`; do not commit real credentials.

## 3. .env Example

```env
MONGO_ENABLED=false
MONGO_URI="mongodb://localhost:27017"
MONGO_DB_NAME="ai_fitness_coach"
```

Atlas example:

```env
MONGO_ENABLED=true
MONGO_URI="mongodb+srv://<username>:<password>@<cluster-url>/ai_fitness_coach"
MONGO_DB_NAME="ai_fitness_coach"
```

## 4. How To Enable Mongo

1. Install dependencies:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

2. Set `MONGO_ENABLED=true` in `backend/.env`.

3. Start the backend:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

4. Check status:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:8000/health -UseBasicParsing
```

## 5. What Currently Uses MongoDB

MongoDB is currently used as an optional sidecar store for:

- `activity_events`: append-only event records for login, diet logs, workouts,
  video watches, subscriptions, and profile updates.
- `exercise_videos`: optional Mongo-backed admin video metadata through
  `/api/v1/mongo/videos`.

The app keeps writing the existing SQLite activity counters even when MongoDB is
enabled.

## 6. What Still Uses SQLite

SQLite/SQLAlchemy still powers the current demo flows:

- JWT and OTP auth
- User and admin roles
- Profiles
- Diet logs and food items
- Workout results
- Activity heatmap and dashboard counters
- Existing video library/admin video endpoints
- Subscription plans and mock purchases

MongoDB is intentionally additive for now so the demo remains stable.
