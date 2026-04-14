from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from db import db, get_current_user, STAGE_NAMES, UPLOADS_DIR
from models import ImportCreate, CostEstimatorInput, AutomationRule
from datetime import datetime, timezone
from pathlib import Path
from fpdf import FPDF
import uuid
import shutil
import io

router = APIRouter()

# ============ IMPORTS PIPELINE ============

@router.get("/imports")
async def get_imports(search: str = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if search:
        query["$or"] = [{"reference": {"$regex": search, "$options": "i"}}, {"name": {"$regex": search, "$options": "i"}}]
    imports_list = await db.imports.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return imports_list

@router.post("/imports")
async def create_import(imp: ImportCreate, current_user: dict = Depends(get_current_user)):
    import_dict = {
        "id": str(uuid.uuid4()), "reference": imp.reference, "name": imp.name,
        "current_stage": 1, "locked": False,
        "created_at": datetime.now(timezone.utc).isoformat(), "created_by": current_user["user_id"],
        "stages": {str(i): {"completed": False} for i in range(1, 10)}
    }
    import_dict["stages"]["2"]["products"] = []
    import_dict["stages"]["3"]["contacts"] = []
    import_dict["stages"]["4"]["inspection_tests"] = []
    import_dict["stages"]["5"]["advances"] = []
    import_dict["stages"]["6"]["quality_inspections"] = []
    import_dict["stages"]["6"]["product_status"] = []
    import_dict["stages"]["8"]["tariff_measures"] = []
    import_dict["stages"]["8"]["non_tariff_measures"] = []
    await db.imports.insert_one(import_dict)
    created = await db.imports.find_one({"id": import_dict["id"]}, {"_id": 0})
    return created

@router.get("/imports/{import_id}")
async def get_import(import_id: str, current_user: dict = Depends(get_current_user)):
    imp = await db.imports.find_one({"id": import_id}, {"_id": 0})
    if not imp:
        raise HTTPException(status_code=404, detail="Importacion no encontrada")
    return imp

@router.put("/imports/{import_id}/stage/{stage_num}")
async def update_import_stage(import_id: str, stage_num: int, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    existing = await db.imports.find_one({"id": import_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Importacion no encontrada")
    if existing.get("locked"):
        raise HTTPException(status_code=403, detail="Importacion bloqueada")
    if stage_num < 1 or stage_num > 9:
        raise HTTPException(status_code=400, detail="Etapa invalida")
    await db.imports.update_one(
        {"id": import_id},
        {"$set": {f"stages.{stage_num}": body, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    updated = await db.imports.find_one({"id": import_id}, {"_id": 0})
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": current_user["user_id"],
        "title": f"Etapa {stage_num} actualizada",
        "message": f"{existing['reference']}: {STAGE_NAMES.get(stage_num, '')} modificada",
        "type": "info", "read": False, "created_at": datetime.now(timezone.utc).isoformat()
    })
    return updated

@router.put("/imports/{import_id}/advance")
async def advance_import_stage(import_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.imports.find_one({"id": import_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Importacion no encontrada")
    if existing.get("locked"):
        raise HTTPException(status_code=403, detail="Importacion bloqueada")
    current = existing.get("current_stage", 1)
    if current >= 9:
        raise HTTPException(status_code=400, detail="Ya esta en la ultima etapa")
    await db.imports.update_one(
        {"id": import_id},
        {"$set": {"current_stage": current + 1, f"stages.{current}.completed": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    updated = await db.imports.find_one({"id": import_id}, {"_id": 0})
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": current_user["user_id"],
        "title": f"Avance a etapa {current + 1}",
        "message": f"{existing['reference']}: {STAGE_NAMES.get(current + 1, '')}",
        "type": "success", "read": False, "created_at": datetime.now(timezone.utc).isoformat()
    })
    return updated

@router.put("/imports/{import_id}/lock")
async def toggle_import_lock(import_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.imports.find_one({"id": import_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Importacion no encontrada")
    new_locked = not existing.get("locked", False)
    await db.imports.update_one({"id": import_id}, {"$set": {"locked": new_locked, "updated_at": datetime.now(timezone.utc).isoformat()}})
    updated = await db.imports.find_one({"id": import_id}, {"_id": 0})
    return updated

@router.delete("/imports/{import_id}")
async def delete_import(import_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.imports.delete_one({"id": import_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Importacion no encontrada")
    return {"message": "Importacion eliminada"}

@router.post("/imports/{import_id}/send-email")
async def send_import_email(import_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    existing = await db.imports.find_one({"id": import_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Importacion no encontrada")
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": current_user["user_id"],
        "title": f"Email: {body.get('subject', 'Sin asunto')}",
        "message": f"Para: {body.get('to', '')} - Ref: {existing['reference']}",
        "type": "info", "read": False, "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Email registrado (integracion pendiente)", "status": "queued"}

# ============ COST ESTIMATOR ============

@router.post("/cost-estimator")
async def calculate_costs(data: CostEstimatorInput, current_user: dict = Depends(get_current_user)):
    cif = data.product_value + data.freight_cost + data.insurance_cost
    duties = cif * (data.tariff_rate / 100)
    taxable = cif + duties + data.other_costs
    vat = taxable * (data.vat_rate / 100)
    total = taxable + vat
    margin = total * (data.margin_percent / 100)
    final_price = total + margin
    return {
        "product_value": data.product_value, "freight_cost": data.freight_cost,
        "insurance_cost": data.insurance_cost, "cif_value": round(cif, 2),
        "tariff_rate": data.tariff_rate, "customs_duties": round(duties, 2),
        "other_costs": data.other_costs, "taxable_base": round(taxable, 2),
        "vat_rate": data.vat_rate, "vat_amount": round(vat, 2),
        "total_cost": round(total, 2), "margin_percent": data.margin_percent,
        "margin_amount": round(margin, 2), "final_price": round(final_price, 2)
    }

# ============ PDF EXPORT ============

@router.get("/imports/{import_id}/pdf")
async def export_import_pdf(import_id: str, current_user: dict = Depends(get_current_user)):
    imp = await db.imports.find_one({"id": import_id}, {"_id": 0})
    if not imp:
        raise HTTPException(status_code=404, detail="Importacion no encontrada")
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, f"Importacion: {imp.get('reference','')}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 7, f"{imp.get('name','')}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Etapa actual: {imp.get('current_stage',1)}/9 | Generado: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)
    for snum in range(1, 10):
        sdata = (imp.get("stages") or {}).get(str(snum), {})
        if not sdata:
            continue
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_fill_color(0, 204, 106)
        pdf.cell(0, 8, f"  Etapa {snum}: {STAGE_NAMES.get(snum,'')}", new_x="LMARGIN", new_y="NEXT", fill=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.ln(2)
        for k, v in sdata.items():
            if k == "completed":
                continue
            label = k.replace("_", " ").title()
            if isinstance(v, list):
                if v and isinstance(v[0], dict):
                    pdf.set_font("Helvetica", "I", 9)
                    pdf.cell(0, 6, f"  {label}:", new_x="LMARGIN", new_y="NEXT")
                    for item in v:
                        line = " | ".join(f"{ik}: {iv}" for ik, iv in item.items() if iv)
                        pdf.set_font("Helvetica", "", 8)
                        pdf.cell(0, 5, f"    - {line[:120]}", new_x="LMARGIN", new_y="NEXT")
                elif v:
                    pdf.cell(0, 6, f"  {label}: {', '.join(str(x) for x in v)}", new_x="LMARGIN", new_y="NEXT")
            elif isinstance(v, dict):
                pdf.set_font("Helvetica", "I", 9)
                pdf.cell(0, 6, f"  {label}:", new_x="LMARGIN", new_y="NEXT")
                pdf.set_font("Helvetica", "", 9)
                for dk, dv in v.items():
                    if dv:
                        pdf.cell(0, 5, f"    {dk.replace('_',' ').title()}: {str(dv)[:100]}", new_x="LMARGIN", new_y="NEXT")
            elif v:
                pdf.cell(0, 6, f"  {label}: {str(v)[:120]}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)
    buf = io.BytesIO()
    pdf.output(buf)
    buf.seek(0)
    filename = f"importacion_{imp.get('reference','export')}.pdf"
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})

# ============ FILE UPLOAD ============

@router.post("/files/upload")
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    file_id = str(uuid.uuid4())
    ext = Path(file.filename).suffix if file.filename else ""
    stored_name = f"{file_id}{ext}"
    file_path = UPLOADS_DIR / stored_name
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    file_size = file_path.stat().st_size
    file_meta = {
        "id": file_id, "filename": file.filename, "stored_name": stored_name,
        "content_type": file.content_type or "application/octet-stream",
        "size": file_size, "uploaded_by": current_user["user_id"],
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.files.insert_one(file_meta)
    return {"id": file_id, "filename": file.filename, "size": file_size, "content_type": file.content_type, "url": f"/api/files/{file_id}"}

@router.get("/files/{file_id}")
async def get_file(file_id: str):
    meta = await db.files.find_one({"id": file_id}, {"_id": 0})
    if not meta:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    file_path = UPLOADS_DIR / meta["stored_name"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado en disco")
    return FileResponse(path=str(file_path), filename=meta["filename"], media_type=meta["content_type"])

@router.delete("/files/{file_id}")
async def delete_file(file_id: str, current_user: dict = Depends(get_current_user)):
    meta = await db.files.find_one({"id": file_id}, {"_id": 0})
    if not meta:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    file_path = UPLOADS_DIR / meta["stored_name"]
    if file_path.exists():
        file_path.unlink()
    await db.files.delete_one({"id": file_id})
    return {"message": "Archivo eliminado"}

# ============ AUTOMATIONS ============

@router.get("/automations")
async def get_automations(current_user: dict = Depends(get_current_user)):
    rules = await db.automations.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return rules

@router.post("/automations")
async def create_automation(rule: AutomationRule, current_user: dict = Depends(get_current_user)):
    rule_dict = rule.model_dump()
    rule_dict["id"] = str(uuid.uuid4())
    rule_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    rule_dict["created_by"] = current_user["user_id"]
    await db.automations.insert_one(rule_dict)
    created = await db.automations.find_one({"id": rule_dict["id"]}, {"_id": 0})
    return created

@router.put("/automations/{rule_id}")
async def update_automation(rule_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    existing = await db.automations.find_one({"id": rule_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Regla no encontrada")
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.automations.update_one({"id": rule_id}, {"$set": body})
    updated = await db.automations.find_one({"id": rule_id}, {"_id": 0})
    return updated

@router.delete("/automations/{rule_id}")
async def delete_automation(rule_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.automations.delete_one({"id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Regla no encontrada")
    return {"message": "Regla eliminada"}
