from fastapi import APIRouter, HTTPException, Depends, Request
from db import db, get_current_user
from models import ContactCreate, ContactUpdate, NotificationCreate
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter()

# ============ CONTACT FORM (Public) ============

@router.post("/contact-form")
async def submit_contact_form(request: Request):
    body = await request.json()
    form_data = {
        "id": str(uuid.uuid4()),
        "name": body.get("name", ""),
        "email": body.get("email", ""),
        "phone": body.get("phone", ""),
        "service": body.get("service", ""),
        "message": body.get("message", ""),
        "source": body.get("source", "web"),
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contact_forms.insert_one(form_data)
    return {"message": "Mensaje enviado correctamente. Te contactaremos pronto.", "id": form_data["id"]}

@router.get("/contact-forms")
async def get_contact_forms(status: Optional[str] = None, search: Optional[str] = None, source: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    if source:
        query["source"] = source
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"service": {"$regex": search, "$options": "i"}},
            {"message": {"$regex": search, "$options": "i"}}
        ]
    forms = await db.contact_forms.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return forms

@router.put("/contact-forms/{form_id}")
async def update_contact_form(form_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    existing = await db.contact_forms.find_one({"id": form_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Consulta no encontrada")
    body.pop("id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.contact_forms.update_one({"id": form_id}, {"$set": body})
    updated = await db.contact_forms.find_one({"id": form_id}, {"_id": 0})
    return updated

# ============ GLOBAL SEARCH ============

@router.get("/search")
async def global_search(q: str = "", current_user: dict = Depends(get_current_user)):
    if not q or len(q) < 2:
        return {"results": []}
    regex = {"$regex": q, "$options": "i"}
    results = []
    imports_found = await db.imports.find({"$or": [{"reference": regex}, {"name": regex}]}, {"_id": 0}).limit(5).to_list(5)
    for i in imports_found:
        results.append({"type": "import", "label": f"{i.get('reference','')} - {i.get('name','')}", "id": i.get("id"), "path": "/imports"})
    invoices_found = await db.invoices.find({"$or": [{"invoice_number": regex}, {"contact_name": regex}]}, {"_id": 0}).limit(5).to_list(5)
    for i in invoices_found:
        results.append({"type": "invoice", "label": f"{i.get('invoice_number','')} - {i.get('contact_name','')}", "id": i.get("id"), "path": "/invoices"})
    contacts_found = await db.contacts.find({"$or": [{"name": regex}, {"company": regex}, {"email": regex}]}, {"_id": 0}).limit(5).to_list(5)
    for c in contacts_found:
        results.append({"type": "contact", "label": f"{c.get('name','')} - {c.get('company','')}", "id": c.get("id"), "path": "/crm"})
    shipments_found = await db.shipments.find({"$or": [{"reference": regex}, {"tracking_number": regex}, {"supplier_name": regex}]}, {"_id": 0}).limit(5).to_list(5)
    for s in shipments_found:
        results.append({"type": "shipment", "label": f"{s.get('reference','')} - {s.get('supplier_name','')}", "id": s.get("id"), "path": "/shipments"})
    transactions_found = await db.accounting_transactions.find({"$or": [{"description": regex}, {"reference": regex}]}, {"_id": 0}).limit(5).to_list(5)
    for t in transactions_found:
        results.append({"type": "transaction", "label": f"{t.get('reference','')} - {t.get('description','')}", "id": t.get("id"), "path": "/accounting"})
    return {"results": results, "total": len(results)}

# ============ CONTACTS ============

@router.get("/contacts")
async def get_contacts(type: Optional[str] = None, search: Optional[str] = None, skip: int = 0, limit: int = 100, current_user: dict = Depends(get_current_user)):
    query = {}
    if type:
        query["type"] = type
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    contacts = await db.contacts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).to_list(min(limit, 500))
    return contacts

@router.post("/contacts")
async def create_contact(contact: ContactCreate, current_user: dict = Depends(get_current_user)):
    contact_dict = contact.model_dump()
    contact_dict["id"] = str(uuid.uuid4())
    contact_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    contact_dict["created_by"] = current_user["user_id"]
    await db.contacts.insert_one(contact_dict)
    created = await db.contacts.find_one({"id": contact_dict["id"]}, {"_id": 0})
    return created

@router.get("/contacts/{contact_id}")
async def get_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    return contact

@router.put("/contacts/{contact_id}")
async def update_contact(contact_id: str, contact: ContactUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in contact.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.contacts.update_one({"id": contact_id}, {"$set": update_data})
    updated = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    return updated

@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    return {"message": "Contacto eliminado"}

# ============ NOTIFICATIONS ============

@router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find({"user_id": current_user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return notifications

@router.post("/notifications")
async def create_notification(notif: NotificationCreate, current_user: dict = Depends(get_current_user)):
    notif_dict = notif.model_dump()
    notif_dict["id"] = str(uuid.uuid4())
    notif_dict["user_id"] = current_user["user_id"]
    notif_dict["read"] = False
    notif_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.notifications.insert_one(notif_dict)
    created = await db.notifications.find_one({"id": notif_dict["id"]}, {"_id": 0})
    return created

@router.put("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": notif_id, "user_id": current_user["user_id"]}, {"$set": {"read": True}})
    return {"message": "Notificacion marcada como leida"}

@router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": current_user["user_id"], "read": False}, {"$set": {"read": True}})
    return {"message": "Todas las notificaciones marcadas como leidas"}
