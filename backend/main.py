from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import chat, auth, staff, admin
from services.scheduler import start_reminder_engine

app = FastAPI(
    title="DAMS Backend API",
    description="Backend services for the Dental Assistant & Monitoring System",
    version="1.0.0"
)

# Set up CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with frontend URL
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

@app.get("/")
def read_root():
    return {"message": "Welcome to the DAMS Backend API"}
