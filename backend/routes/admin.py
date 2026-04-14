from fastapi import APIRouter, HTTPException, Depends, Request
from db import db, get_current_user, hash_password
from datetime import datetime, timezone
import uuid

router = APIRouter()

# ============ USERS MANAGEMENT ============

@router.get("/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user or user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Sin permisos")
    users = await db.users.find({}, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(500)
    return users

@router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    caller = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not caller or caller.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede cambiar roles")
    body = await request.json()
    new_role = body.get("role", "user")
    if new_role not in ["admin", "manager", "user", "client"]:
        raise HTTPException(status_code=400, detail="Rol invalido")
    await db.users.update_one({"id": user_id}, {"$set": {"role": new_role, "updated_at": datetime.now(timezone.utc).isoformat()}})
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return updated

@router.put("/users/{user_id}/assign-imports")
async def assign_imports_to_client(user_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    caller = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not caller or caller.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Sin permisos")
    body = await request.json()
    import_ids = body.get("import_ids", [])
    await db.users.update_one({"id": user_id}, {"$set": {"assigned_imports": import_ids, "updated_at": datetime.now(timezone.utc).isoformat()}})

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    caller = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not caller or caller.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede eliminar usuarios")
    if user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta")
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await db.users.delete_one({"id": user_id})
    return {"message": "Usuario eliminado"}
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return updated

@router.post("/users/create-client")
async def create_client_user(request: Request, current_user: dict = Depends(get_current_user)):
    caller = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not caller or caller.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Sin permisos")
    body = await request.json()
    existing = await db.users.find_one({"email": body.get("email")}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya esta registrado")
    user_dict = {
        "id": str(uuid.uuid4()),
        "name": body.get("name", ""),
        "email": body.get("email"),
        "password": hash_password(body.get("password", "client123")),
        "role": "client",
        "company": body.get("company", ""),
        "assigned_imports": body.get("import_ids", []),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["user_id"]
    }
    await db.users.insert_one(user_dict)
    return {"id": user_dict["id"], "name": user_dict["name"], "email": user_dict["email"], "role": "client", "company": user_dict["company"], "assigned_imports": user_dict["assigned_imports"]}

# ============ CLIENT PORTAL ============

@router.get("/client/imports")
async def get_client_imports(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    assigned = user.get("assigned_imports", [])
    if not assigned:
        return []
    imports_list = await db.imports.find({"id": {"$in": assigned}}, {"_id": 0}).to_list(100)
    result = []
    for imp in imports_list:
        stage_summaries = {}
        for snum in range(1, 10):
            sd = (imp.get("stages") or {}).get(str(snum), {})
            stage_summaries[str(snum)] = {"completed": sd.get("completed", False)}
        result.append({
            "id": imp["id"], "reference": imp.get("reference", ""),
            "name": imp.get("name", ""), "current_stage": imp.get("current_stage", 1),
            "locked": imp.get("locked", False), "stages": stage_summaries,
            "created_at": imp.get("created_at", "")
        })
    return result

@router.get("/client/imports/{import_id}")
async def get_client_import_detail(import_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    assigned = user.get("assigned_imports", [])
    if import_id not in assigned and user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Sin acceso a esta importacion")
    imp = await db.imports.find_one({"id": import_id}, {"_id": 0})
    if not imp:
        raise HTTPException(status_code=404, detail="Importacion no encontrada")
    return imp

# ============ PROFITABILITY ANALYSIS ============

@router.get("/profitability-analysis")
async def get_profitability_analysis(current_user: dict = Depends(get_current_user)):
    imports_list = await db.imports.find({}, {"_id": 0, "id": 1, "reference": 1, "name": 1, "current_stage": 1, "created_at": 1}).to_list(500)
    invoices_list = await db.invoices.find({}, {"_id": 0, "id": 1, "import_id": 1, "type": 1, "status": 1, "total": 1}).to_list(500)
    transactions_list = await db.transactions.find({}, {"_id": 0, "reference": 1, "type": 1, "amount": 1}).to_list(2000)

    import_profitability = []
    for imp in imports_list:
        imp_id = imp.get("id", "")
        imp_ref = imp.get("reference", "")
        imp_name = imp.get("name", imp_ref)
        revenue = sum(inv.get("total", 0) for inv in invoices_list if inv.get("import_id") == imp_id and inv.get("type") == "sale" and inv.get("status") == "paid")
        revenue += sum(tx.get("amount", 0) for tx in transactions_list if tx.get("reference") == imp_ref and tx.get("type") == "income")
        costs = sum(inv.get("total", 0) for inv in invoices_list if inv.get("import_id") == imp_id and inv.get("type") == "purchase")
        costs += sum(tx.get("amount", 0) for tx in transactions_list if tx.get("reference") == imp_ref and tx.get("type") == "expense")
        margin = revenue - costs
        margin_pct = (margin / revenue * 100) if revenue > 0 else 0
        import_profitability.append({
            "import_id": imp_id, "reference": imp_ref, "name": imp_name,
            "revenue": round(revenue, 2), "costs": round(costs, 2),
            "margin": round(margin, 2), "margin_pct": round(margin_pct, 1),
            "stage": imp.get("current_stage", 1), "created_at": imp.get("created_at", "")
        })

    total_revenue = sum(i["revenue"] for i in import_profitability)
    total_costs = sum(i["costs"] for i in import_profitability)
    total_margin = total_revenue - total_costs
    avg_margin_pct = (total_margin / total_revenue * 100) if total_revenue > 0 else 0

    monthly_trend = {}
    for tx in transactions_list:
        tx_date = tx.get("date", tx.get("created_at", ""))
        if not tx_date: continue
        month_key = tx_date[:7]
        if month_key not in monthly_trend:
            monthly_trend[month_key] = {"month": month_key, "revenue": 0, "costs": 0}
        if tx.get("type") == "income": monthly_trend[month_key]["revenue"] += tx.get("amount", 0)
        elif tx.get("type") == "expense": monthly_trend[month_key]["costs"] += tx.get("amount", 0)
    for inv in invoices_list:
        inv_date = inv.get("created_at", "")
        if not inv_date: continue
        month_key = inv_date[:7]
        if month_key not in monthly_trend:
            monthly_trend[month_key] = {"month": month_key, "revenue": 0, "costs": 0}
        if inv.get("type") == "sale" and inv.get("status") == "paid":
            monthly_trend[month_key]["revenue"] += inv.get("total", 0)
    trend_sorted = sorted(monthly_trend.values(), key=lambda x: x["month"])
    for t in trend_sorted: t["margin"] = round(t["revenue"] - t["costs"], 2); t["revenue"] = round(t["revenue"], 2); t["costs"] = round(t["costs"], 2)

    cost_by_category = {}
    for tx in transactions_list:
        if tx.get("type") == "expense":
            cat = tx.get("category", "Otros")
            cost_by_category[cat] = cost_by_category.get(cat, 0) + tx.get("amount", 0)
    cost_breakdown = [{"category": k, "amount": round(v, 2)} for k, v in sorted(cost_by_category.items(), key=lambda x: -x[1])]

    return {
        "summary": {
            "total_revenue": round(total_revenue, 2), "total_costs": round(total_costs, 2),
            "total_margin": round(total_margin, 2), "avg_margin_pct": round(avg_margin_pct, 1),
            "total_imports": len(imports_list),
            "profitable_imports": len([i for i in import_profitability if i["margin"] > 0])
        },
        "imports": sorted(import_profitability, key=lambda x: -x["margin"]),
        "monthly_trend": trend_sorted, "cost_breakdown": cost_breakdown
    }

# ============ TREASURY ============

@router.get("/treasury/forecast")
async def get_treasury_forecast(months_ahead: int = 3, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    receivable = await db.invoices.find({"status": {"$in": ["sent", "draft", "overdue"]}, "type": "sale"}, {"_id": 0}).to_list(500)
    payable = await db.invoices.find({"status": {"$in": ["sent", "draft", "overdue"]}, "type": {"$in": ["purchase", "expense"]}}, {"_id": 0}).to_list(500)
    scheduled_payments = await db.supplier_payments.find({"status": {"$in": ["scheduled", "pending"]}}, {"_id": 0}).to_list(500)

    pipe_balance = [{"$group": {"_id": "$type", "total": {"$sum": "$amount"}}}]
    balance_data = await db.accounting_transactions.aggregate(pipe_balance).to_list(10)
    income_total = 0
    expense_total = 0
    for b in balance_data:
        if b["_id"] == "income": income_total = b["total"]
        elif b["_id"] == "expense": expense_total = b["total"]
    current_balance = income_total - expense_total

    forecast = []
    running_balance = current_balance
    for m in range(months_ahead):
        target_month = now.month + m
        target_year = now.year + (target_month - 1) // 12
        target_month = ((target_month - 1) % 12) + 1
        month_start = f"{target_year}-{target_month:02d}-01"
        month_end = f"{target_year}-{target_month:02d}-31"
        month_receivable = sum(inv.get("total", 0) for inv in receivable if (inv.get("due_date", "") or "9999") >= month_start and (inv.get("due_date", "") or "0000") <= month_end)
        month_payable = sum(inv.get("total", 0) for inv in payable if (inv.get("due_date", "") or "9999") >= month_start and (inv.get("due_date", "") or "0000") <= month_end)
        month_payments = sum(p.get("amount", 0) for p in scheduled_payments if (p.get("due_date", "") or "9999") >= month_start and (p.get("due_date", "") or "0000") <= month_end)
        total_outflow = month_payable + month_payments
        running_balance = running_balance + month_receivable - total_outflow
        month_names = {1:"Ene",2:"Feb",3:"Mar",4:"Abr",5:"May",6:"Jun",7:"Jul",8:"Ago",9:"Sep",10:"Oct",11:"Nov",12:"Dic"}
        forecast.append({
            "month": f"{month_names[target_month]} {target_year}", "month_num": f"{target_year}-{target_month:02d}",
            "receivable": month_receivable, "payable": total_outflow,
            "net": month_receivable - total_outflow, "projected_balance": running_balance
        })

    total_receivable = sum(inv.get("total", 0) for inv in receivable)
    total_payable = sum(inv.get("total", 0) for inv in payable)
    total_scheduled = sum(p.get("amount", 0) for p in scheduled_payments)
    return {
        "current_balance": current_balance, "total_receivable": total_receivable,
        "total_payable": total_payable + total_scheduled, "projected_balance": running_balance,
        "pending_invoices_receivable": len(receivable), "pending_invoices_payable": len(payable),
        "scheduled_payments": len(scheduled_payments), "forecast": forecast,
        "receivable_detail": [{"id": i.get("id"), "invoice_number": i.get("invoice_number"), "contact_name": i.get("contact_name"), "total": i.get("total", 0), "due_date": i.get("due_date", ""), "status": i.get("status")} for i in receivable],
        "payable_detail": [{"id": i.get("id"), "invoice_number": i.get("invoice_number"), "contact_name": i.get("contact_name"), "total": i.get("total", 0), "due_date": i.get("due_date", ""), "status": i.get("status")} for i in payable],
        "payments_detail": [{"id": p.get("id"), "supplier_name": p.get("supplier_name"), "amount": p.get("amount", 0), "due_date": p.get("due_date", ""), "status": p.get("status")} for p in scheduled_payments]
    }

# ============ SETTINGS ============

@router.put("/settings/profile")
async def update_profile(request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    update_data = {}
    if "name" in body: update_data["name"] = body["name"]
    if "phone" in body: update_data["phone"] = body["phone"]
    if "company" in body: update_data["company"] = body["company"]
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"id": current_user["user_id"]}, {"$set": update_data})
    updated = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password": 0})
    return updated

@router.get("/settings/integrations")
async def get_integration_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    if not settings:
        return {"user_id": current_user["user_id"], "m365": {}, "aeat": {}}
    return settings

@router.put("/settings/integrations")
async def save_integration_settings(request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    body["user_id"] = current_user["user_id"]
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.settings.update_one({"user_id": current_user["user_id"]}, {"$set": body}, upsert=True)
    saved = await db.settings.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    return saved
