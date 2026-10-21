from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from routers import chat, auth, staff, admin, patient
from services.scheduler import start_reminder_engine
import os

app = FastAPI(
    title="DAMS Backend API",
    description="Backend services for the Dental Assistant & Monitoring System",
    version="1.0.0"
)

# Set up CORS for the frontend
raw_frontend_url = os.getenv("FRONTEND_URL", "*")
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:3000",
]

if raw_frontend_url and raw_frontend_url != "*":
    for u in raw_frontend_url.split(","):
        cleaned = u.strip().rstrip("/")
        if cleaned and cleaned not in allowed_origins:
            allowed_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if raw_frontend_url != "*" else ["*"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")
app.include_router(auth.router, prefix="/api/auth")
app.include_router(staff.router, prefix="/api/staff")
app.include_router(admin.router, prefix="/api/admin")
app.include_router(patient.router, prefix="/api/patient")

@app.on_event("startup")
async def startup_event():
    start_reminder_engine()

@app.get("/api/ping", response_class=PlainTextResponse)
@app.head("/api/ping", response_class=PlainTextResponse)
def ping():
    return "OK"

@app.get("/api/test-reminders")
async def test_reminders():
    from services.scheduler import process_reminders
    import asyncio
    asyncio.create_task(process_reminders())
    return {"message": "Reminder engine triggered"}

@app.get("/")
def read_root():
    return {"message": "Welcome to the DAMS Backend API"}
