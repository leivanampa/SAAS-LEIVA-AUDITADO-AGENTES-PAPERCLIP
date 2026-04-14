import os
import sys
import logging
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# Rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Ensure backend dir is in path for module imports
sys.path.insert(0, os.path.dirname(__file__))

from db import client, db

# Import routers
from routes.auth import router as auth_router
from routes.dashboard import router as dashboard_router
from routes.crm import router as crm_router
from routes.shipping import router as shipping_router
from routes.finance import router as finance_router
from routes.operations import router as operations_router
from routes.warehouses import router as warehouses_router
from routes.admin import router as admin_router
from routes.contact import router as contact_router
from routes.agents import router as agents_router

import json as json_lib

class JSONFormatter(logging.Formatter):
    """Structured JSON log formatter for production."""
    def format(self, record):
        log_entry = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }
        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json_lib.dumps(log_entry, ensure_ascii=False)

# Use JSON logging in production, readable format in development
IS_DEV = os.environ.get("ENVIRONMENT", "production") == "development"
if IS_DEV:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s | %(levelname)s | %(name)s | %(message)s'
    )
else:
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    logging.root.handlers = [handler]
    logging.root.setLevel(logging.INFO)

logger = logging.getLogger(__name__)


# ============ RATE LIMITING ============
limiter = Limiter(key_func=get_remote_address)


# ============ SECURITY HEADERS MIDDLEWARE ============
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "0"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data: https:; "
            "font-src 'self' https://fonts.gstatic.com; "
            "connect-src 'self' https://*.leivasimport.com; "
            "frame-ancestors 'none'"
        )
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Leiva's Import SAAS API")
    yield
    client.close()
    logger.info("Shutdown complete")


app = FastAPI(
    title="Leiva's Import SAAS API",
    lifespan=lifespan,
    # Hide docs in production
    docs_url="/api/docs" if os.environ.get("ENVIRONMENT", "production") == "development" else None,
    redoc_url=None,
)

# Attach rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ============ CORS — Strict origin whitelist ============
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '')
if not CORS_ORIGINS:
    logger.warning(
        "CORS_ORIGINS not set! Defaulting to localhost only. "
        "Set CORS_ORIGINS in .env (e.g., https://leivasimport.com,https://www.leivasimport.com)"
    )
    CORS_ORIGINS = "http://localhost:3000"

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[origin.strip() for origin in CORS_ORIGINS.split(',')],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Add security headers
app.add_middleware(SecurityHeadersMiddleware)


# ============ GLOBAL ERROR HANDLER ============
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled errors — log full trace, return safe message."""
    logger.error(f"Unhandled error on {request.method} {request.url}: {traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"}
    )


# Include all routers under /api prefix
from fastapi import APIRouter
api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router)
api_router.include_router(dashboard_router)
api_router.include_router(crm_router)
api_router.include_router(shipping_router)
api_router.include_router(finance_router)
api_router.include_router(operations_router)
api_router.include_router(warehouses_router)
api_router.include_router(admin_router)
api_router.include_router(contact_router)
api_router.include_router(agents_router)


@api_router.get("/")
async def root():
    return {"message": "Leiva's Import SAAS API"}


@api_router.get("/health")
async def health():
    checks = {}
    try:
        await db.command("ping")
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"

    status = "healthy" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": status, "checks": checks}


app.include_router(api_router)
