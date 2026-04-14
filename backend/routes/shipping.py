from fastapi import APIRouter, HTTPException, Depends
from db import db, get_current_user
from models import ShipmentCreate, ShipmentUpdate, StatusEventCreate, DocumentCreate
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter()

# ============ SHIPMENTS ============

@router.get("/shipments")
async def get_shipments(status: Optional[str] = None, search: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"reference": {"$regex": search, "$options": "i"}},
            {"supplier_name": {"$regex": search, "$options": "i"}},
            {"product_description": {"$regex": search, "$options": "i"}},
            {"tracking_number": {"$regex": search, "$options": "i"}}
        ]
    shipments = await db.shipments.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return shipments

@router.post("/shipments")
async def create_shipment(shipment: ShipmentCreate, current_user: dict = Depends(get_current_user)):
    shipment_dict = shipment.model_dump()
    shipment_dict["id"] = str(uuid.uuid4())
    shipment_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    shipment_dict["created_by"] = current_user["user_id"]
    shipment_dict["status_history"] = [{
        "status": shipment.status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "description": "Envio creado"
    }]
    await db.shipments.insert_one(shipment_dict)
    created = await db.shipments.find_one({"id": shipment_dict["id"]}, {"_id": 0})
    return created

@router.get("/shipments/{shipment_id}")
async def get_shipment(shipment_id: str, current_user: dict = Depends(get_current_user)):
    shipment = await db.shipments.find_one({"id": shipment_id}, {"_id": 0})
    if not shipment:
        raise HTTPException(status_code=404, detail="Envio no encontrado")
    return shipment

@router.put("/shipments/{shipment_id}")
async def update_shipment(shipment_id: str, shipment: ShipmentUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in shipment.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    if "status" in update_data:
        existing = await db.shipments.find_one({"id": shipment_id}, {"_id": 0})
        if existing and existing.get("status") != update_data["status"]:
            status_event = {
                "status": update_data["status"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "description": f"Estado cambiado a {update_data['status']}"
            }
            await db.shipments.update_one({"id": shipment_id}, {"$push": {"status_history": status_event}})
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.shipments.update_one({"id": shipment_id}, {"$set": update_data})
    updated = await db.shipments.find_one({"id": shipment_id}, {"_id": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Envio no encontrado")
    return updated

@router.delete("/shipments/{shipment_id}")
async def delete_shipment(shipment_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.shipments.delete_one({"id": shipment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Envio no encontrado")
    return {"message": "Envio eliminado"}

@router.post("/shipments/{shipment_id}/status")
async def add_status_event(shipment_id: str, event: StatusEventCreate, current_user: dict = Depends(get_current_user)):
    shipment = await db.shipments.find_one({"id": shipment_id}, {"_id": 0})
    if not shipment:
        raise HTTPException(status_code=404, detail="Envio no encontrado")
    status_event = {
        "status": event.status,
        "location": event.location,
        "description": event.description,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.shipments.update_one(
        {"id": shipment_id},
        {"$push": {"status_history": status_event}, "$set": {"status": event.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    updated = await db.shipments.find_one({"id": shipment_id}, {"_id": 0})
    return updated

# ============ DOCUMENTS ============

@router.get("/documents")
async def get_documents(category: Optional[str] = None, shipment_id: Optional[str] = None, search: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if category:
        query["category"] = category
    if shipment_id:
        query["shipment_id"] = shipment_id
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    documents = await db.documents.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return documents

@router.post("/documents")
async def create_document(doc: DocumentCreate, current_user: dict = Depends(get_current_user)):
    doc_dict = doc.model_dump()
    doc_dict["id"] = str(uuid.uuid4())
    doc_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    doc_dict["created_by"] = current_user["user_id"]
    await db.documents.insert_one(doc_dict)
    created = await db.documents.find_one({"id": doc_dict["id"]}, {"_id": 0})
    return created

@router.get("/documents/{doc_id}")
async def get_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return doc

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.documents.delete_one({"id": doc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return {"message": "Documento eliminado"}
