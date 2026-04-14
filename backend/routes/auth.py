from fastapi import APIRouter, HTTPException, Depends
from db import db, hash_password, verify_password, create_token, get_current_user
from models import UserCreate, UserLogin, ForgotPasswordRequest, ResetPasswordRequest
from datetime import datetime, timezone
import uuid

router = APIRouter()

@router.post("/auth/register")
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya esta registrado")
    user_dict = {
        "id": str(uuid.uuid4()),
        "name": user.name,
        "email": user.email,
        "password": hash_password(user.password),
        "role": user.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_dict)
    token = create_token(user_dict["id"], user_dict["email"], user_dict["role"])
    return {"token": token, "user": {"id": user_dict["id"], "name": user_dict["name"], "email": user_dict["email"], "role": user_dict["role"]}}

@router.post("/auth/login")
async def login(user: UserLogin):
    found = await db.users.find_one({"email": user.email}, {"_id": 0})
    if not found or not verify_password(user.password, found["password"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    role = found.get("role", "user")
    token = create_token(found["id"], found["email"], role)
    return {"token": token, "user": {"id": found["id"], "name": found["name"], "email": found["email"], "role": role}}

@router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user

@router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    user = await db.users.find_one({"email": req.email}, {"_id": 0})
    if not user:
        return {"message": "Si el email existe, recibiras instrucciones"}
    reset_token = str(uuid.uuid4())
    await db.password_resets.insert_one({
        "email": req.email,
        "token": reset_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "used": False
    })
    return {"message": "Si el email existe, recibiras instrucciones", "reset_token": reset_token}

@router.post("/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    reset = await db.password_resets.find_one({"token": req.token, "used": False}, {"_id": 0})
    if not reset:
        raise HTTPException(status_code=400, detail="Token invalido o expirado")
    new_hashed = hash_password(req.new_password)
    await db.users.update_one({"email": reset["email"]}, {"$set": {"password": new_hashed}})
    await db.password_resets.update_one({"token": req.token}, {"$set": {"used": True}})
    return {"message": "Contrasena actualizada"}
