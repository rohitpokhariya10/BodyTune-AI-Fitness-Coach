
# BodyTune AI — AI Fitness Coach Platform

BodyTune AI is a full-stack AI fitness and nutrition platform with role-based user/admin dashboards, OTP authentication, nutrition tracking, workout tracking, posture-based live workout coaching, activity streak heatmap, subscription access, and ImageKit-powered video media delivery.

## Features

- JWT + OTP email authentication
- User/admin role-based access
- Admin registration key
- User dashboard
- Profile management
- Nutrition and macro tracking
- Live camera workout coaching
- Posture, rep, and form tracking
- Workout results history
- GitHub-style activity heatmap
- Admin video management
- ImageKit video/thumbnail uploads
- Premium/free video access
- Subscription plans
- Optional MongoDB configuration
- Responsive premium dark UI

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- GSAP
- Three.js / React Three Fiber
- Recharts

### Backend

- FastAPI
- Uvicorn
- SQLAlchemy
- SQLite for local demo
- JWT auth
- SMTP email OTP
- ImageKit
- MongoDB optional

## Architecture Overview

The React frontend calls FastAPI APIs for authentication, user workflows, admin content management, subscriptions, nutrition, workouts, and results. The backend owns auth, business logic, validation, and persistence.

SQLite stores the stable local demo transactional data through SQLAlchemy. ImageKit stores uploaded admin exercise videos and thumbnails; the database stores only media URLs, ImageKit file IDs, and metadata. MongoDB can be enabled for scalable document/event storage depending on enabled modules. Camera posture detection runs in the browser using camera APIs and pose landmark/joint-angle logic, then workout results are saved to the backend.

## Folder Structure

```text
backend/
  app/
  uploads/
  requirements.txt
  .env.example

frontend/
  src/
  package.json
  .env.example

README.md
.gitignore
```

## Setup

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
copy .env.example .env
python -m uvicorn app.main:app --host 127.0.0.1 --port 9000
```

### Frontend

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

## Environment Variables

`backend/.env` is required for JWT, OTP timing, SMTP email delivery, ImageKit media uploads, admin setup, and optional MongoDB configuration.

`frontend/.env` needs:

```text
VITE_API_BASE_URL=http://127.0.0.1:9000
```

Never commit real `.env` files.

## ImageKit Media Upload

Admin video and thumbnail uploads go through the backend. The backend uploads files directly to ImageKit, stores the returned URL and file ID, and users stream media from the ImageKit CDN. Video binaries and thumbnail binaries are not stored in SQLite or MongoDB.

## MongoDB Note

MongoDB is optional/configurable. The stable local demo uses SQLite/SQLAlchemy for core transactional data. MongoDB can be enabled using `MONGO_ENABLED=true` for document/event storage depending on enabled modules.

## Camera/Posture Detection Note

Camera processing runs on the frontend using browser camera APIs and pose landmark/joint-angle logic. Workout results are saved to the backend after a session.

## Demo Credentials

Admin:

```text
admin@example.com / Admin@123
```

User:

```text
Create via registration flow.
```

## Common Commands

Backend:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 9000
```

Frontend:

```powershell
npm run dev
npm run build
```

Tests:

```powershell
cd backend
pytest app/tests
```

## Security Notes

- Do not commit `.env` files.
- Rotate leaked API keys immediately.
- Keep the ImageKit private key backend-only.
- Use a Gmail app password, not a real Gmail password.
- Enable MongoDB auth or use MongoDB Atlas for production.
- Use a production database instead of local SQLite for deployment.
- Use HTTPS and secure cookie/token practices in production.

## Deployment Notes

For production, use PostgreSQL and/or MongoDB Atlas, secure secret management, HTTPS, a reliable email provider, and object/CDN media storage. Review CORS origins, logging, admin registration, and database migration strategy before deployment.
