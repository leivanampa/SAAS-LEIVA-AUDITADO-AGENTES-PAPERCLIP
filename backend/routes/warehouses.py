from fastapi import APIRouter, HTTPException, Depends, Request
from db import db, get_current_user
from models import WarehouseCreate
from datetime import datetime, timezone
import uuid

router = APIRouter()

@router.get("/warehouses")
async def get_warehouses(current_user: dict = Depends(get_current_user)):
    warehouses = await db.warehouses.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return warehouses

@router.post("/warehouses")
async def create_warehouse(wh: WarehouseCreate, current_user: dict = Depends(get_current_user)):
    wh_dict = wh.model_dump()
    wh_dict["id"] = str(uuid.uuid4())
    wh_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    wh_dict["created_by"] = current_user["user_id"]
    await db.warehouses.insert_one(wh_dict)
    created = await db.warehouses.find_one({"id": wh_dict["id"]}, {"_id": 0})
    return created

@router.get("/warehouses/{wh_id}")
async def get_warehouse(wh_id: str, current_user: dict = Depends(get_current_user)):
    wh = await db.warehouses.find_one({"id": wh_id}, {"_id": 0})
    if not wh:
        raise HTTPException(status_code=404, detail="Almacen no encontrado")
    return wh

@router.put("/warehouses/{wh_id}")
async def update_warehouse(wh_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    existing = await db.warehouses.find_one({"id": wh_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Almacen no encontrado")
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.warehouses.update_one({"id": wh_id}, {"$set": body})
    updated = await db.warehouses.find_one({"id": wh_id}, {"_id": 0})
    return updated

@router.delete("/warehouses/{wh_id}")
async def delete_warehouse(wh_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.warehouses.delete_one({"id": wh_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Almacen no encontrado")
    await db.warehouse_inventory.delete_many({"warehouse_id": wh_id})
    return {"message": "Almacen eliminado"}

# ============ INVENTORY ============

@router.get("/warehouses/{wh_id}/inventory")
async def get_warehouse_inventory(wh_id: str, current_user: dict = Depends(get_current_user)):
    items = await db.warehouse_inventory.find({"warehouse_id": wh_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@router.post("/warehouses/{wh_id}/inventory")
async def add_inventory_item(wh_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    wh = await db.warehouses.find_one({"id": wh_id}, {"_id": 0})
    if not wh:
        raise HTTPException(status_code=404, detail="Almacen no encontrado")
    item = {
        "id": str(uuid.uuid4()),
        "warehouse_id": wh_id,
        "product_name": body.get("product_name", ""),
        "sku": body.get("sku", ""),
        "quantity": body.get("quantity", 0),
        "location": body.get("location", ""),
        "import_reference": body.get("import_reference", ""),
        "supplier": body.get("supplier", ""),
        "batch": body.get("batch", ""),
        "weight_kg": body.get("weight_kg", 0),
        "dimensions": body.get("dimensions", ""),
        "entry_date": body.get("entry_date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "notes": body.get("notes", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.warehouse_inventory.insert_one(item)
    created = await db.warehouse_inventory.find_one({"id": item["id"]}, {"_id": 0})
    return created

@router.put("/warehouses/{wh_id}/inventory/{item_id}")
async def update_inventory_item(wh_id: str, item_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    existing = await db.warehouse_inventory.find_one({"id": item_id, "warehouse_id": wh_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    body.pop("id", None)
    body.pop("warehouse_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.warehouse_inventory.update_one({"id": item_id, "warehouse_id": wh_id}, {"$set": body})
    updated = await db.warehouse_inventory.find_one({"id": item_id, "warehouse_id": wh_id}, {"_id": 0})
    return updated

@router.delete("/warehouses/{wh_id}/inventory/{item_id}")
async def delete_inventory_item(wh_id: str, item_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.warehouse_inventory.delete_one({"id": item_id, "warehouse_id": wh_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    return {"message": "Item eliminado"}
