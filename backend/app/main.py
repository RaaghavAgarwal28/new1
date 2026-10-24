from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.auth import auth_router
from app.api.routes import router
from app.api.tax_routes import tax_router
from app.core.config import REPORTS_DIR, settings
from app.core.middleware import register_middleware


app = FastAPI(
    title="VARUNA API",
    description=(
        "Real-time mule-chain interception command center API.\n\n"
        "## Authentication\n"
        "- **JWT Bearer Token**: POST `/api/auth/login` to get a token\n"
        "- **Dev Mode**: Auto-authenticated in development environment\n\n"
        "## Demo Credentials\n"
        "- Admin: `varuna_admin` / `DevHouse2026$ecure`\n"
        "- Analyst: `analyst` / `Analyst2026$ecure`\n"
        "- Viewer: `viewer` / `ViewOnly2026`"
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS (environment-aware) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if settings.environment != "development" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Request-ID",
        "X-Response-Time",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
    ],
)

# ── Security Middleware ──
register_middleware(app)

# ── Routes ──
app.include_router(auth_router, prefix="/api")
app.include_router(router, prefix="/api")
app.include_router(tax_router, prefix="/api")
app.mount("/reports", StaticFiles(directory=REPORTS_DIR), name="reports")
