from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from routers import chat, auth, staff, admin
from services.scheduler import start_reminder_engine
import os

app = FastAPI(
    title="DAMS Backend API",
    description="Backend services for the Dental Assistant & Monitoring System",
    version="1.0.0"
)

# Set up CORS for the frontend
frontend_url = os.getenv("FRONTEND_URL", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url] if frontend_url != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")
app.include_router(auth.router, prefix="/api/auth")
app.include_router(staff.router, prefix="/api/staff")
app.include_router(admin.router, prefix="/api/admin")

@app.on_event("startup")
async def startup_event():
    start_reminder_engine()

@app.get("/api/ping", response_class=PlainTextResponse)
@app.head("/api/ping", response_class=PlainTextResponse)
def ping():
    return "OK"

@app.get("/")
def read_root():
    return {"message": "Welcome to the DAMS Backend API"}
