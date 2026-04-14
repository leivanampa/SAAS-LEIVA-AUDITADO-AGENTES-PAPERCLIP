from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta
import os
import jwt
import bcrypt
import logging
import httpx

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT
JWT_SECRET = os.environ.get('JWT_SECRET', 'leivas-import-saas-secret-2024')
JWT_ALGORITHM = "HS256"
security = HTTPBearer()

# Constants
STAGE_NAMES = {1: "Proveedor", 2: "Producto", 3: "Negociacion", 4: "Muestras", 5: "Pedido", 6: "Produccion", 7: "Logistica", 8: "Aduana", 9: "Entrega Final"}

ACCOUNTING_CATEGORIES = {
    "income": ["ventas", "servicios", "comisiones", "otros_ingresos", "devolucion_proveedor"],
    "expense": ["mercancia", "flete", "aduanas", "seguro", "almacenaje", "transporte_local", "servicios_profesionales", "personal", "oficina", "marketing", "impuestos", "financieros", "otros_gastos"]
}

# Auth helpers
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalido")


async def get_agent_auth(request: Request) -> dict:
    """
    Auth dependency for agent/orchestrator endpoints.
    Accepts either:
      - X-Agent-Key header (static key stored in agent_api_keys collection)
      - Standard JWT Bearer token (admin users only)
    """
    # Try X-Agent-Key first (orchestrator-to-SaaS calls)
    agent_key = request.headers.get("X-Agent-Key")
    if agent_key:
        key_doc = await db.agent_api_keys.find_one({"key": agent_key, "active": True})
        if not key_doc:
            raise HTTPException(status_code=401, detail="Agent key invalido")
        return {"auth_type": "agent_key", "agent_id": key_doc.get("agent_id", "orchestrator")}

    # Fall back to JWT (admin user accessing agents dashboard)
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("role") != "admin":
                raise HTTPException(status_code=403, detail="Se requiere rol admin")
            return {"auth_type": "jwt", "user_id": payload.get("user_id"), "role": "admin"}
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expirado")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Token invalido")

    raise HTTPException(status_code=401, detail="Autenticacion requerida")


async def emit_event(event_type: str, payload: dict) -> None:
    """
    Fire-and-forget event emission to the orchestrator webhook.
    Used by SaaS routes to trigger agents when key events occur
    (import stage change, new shipment, new contact form, etc.).
    Silently ignores failures — never blocks the main SaaS request.
    """
    orchestrator_url = os.environ.get("ORCHESTRATOR_WEBHOOK_URL", "")
    webhook_secret = os.environ.get("N8N_WEBHOOK_SECRET", "")
    if not orchestrator_url:
        return
    try:
        async with httpx.AsyncClient(timeout=1.0) as http_client:
            await http_client.post(
                f"{orchestrator_url}/webhook",
                json={"event_type": event_type, "payload": payload},
                headers={"X-Agent-Key": webhook_secret},
            )
    except Exception as e:
        logger.warning(f"emit_event failed for {event_type}: {e}")
