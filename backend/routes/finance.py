from fastapi import APIRouter, HTTPException, Depends, Request
from db import db, get_current_user, ACCOUNTING_CATEGORIES
from models import InvoiceCreate, InvoiceUpdate, TransactionCreate, TransactionUpdate, SupplierPaymentCreate
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter()

# ============ INVOICES ============

@router.get("/invoices")
async def get_invoices(status: Optional[str] = None, type: Optional[str] = None, search: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    if type:
        query["type"] = type
    if search:
        query["$or"] = [
            {"invoice_number": {"$regex": search, "$options": "i"}},
            {"contact_name": {"$regex": search, "$options": "i"}}
        ]
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return invoices

@router.post("/invoices")
async def create_invoice(invoice: InvoiceCreate, current_user: dict = Depends(get_current_user)):
    inv_dict = invoice.model_dump()
    inv_dict["id"] = str(uuid.uuid4())
    inv_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    inv_dict["created_by"] = current_user["user_id"]
    await db.invoices.insert_one(inv_dict)
    created = await db.invoices.find_one({"id": inv_dict["id"]}, {"_id": 0})
    return created

@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return invoice

@router.put("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, invoice: InvoiceUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in invoice.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    existing = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    if update_data.get("status") == "paid" and existing.get("status") != "paid":
        tx_type = "income" if existing.get("type") == "sale" else "expense"
        subtotal = existing.get("subtotal", 0)
        tax_amount = existing.get("tax_amount", 0)
        total = existing.get("total", 0)
        tx = {
            "id": str(uuid.uuid4()), "type": tx_type,
            "base_amount": subtotal, "iva_rate": existing.get("tax_rate", 21),
            "iva_amount": tax_amount, "amount": total,
            "description": f"Factura {existing.get('invoice_number', '')} - {existing.get('contact_name', '')}",
            "category": "ventas" if tx_type == "income" else "mercancia",
            "reference": existing.get("invoice_number", ""),
            "payment_method": existing.get("payment_method", ""),
            "status": "paid", "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "contact_id": existing.get("contact_id", ""),
            "contact_name": existing.get("contact_name", ""),
            "invoice_id": invoice_id, "labels": ["auto-factura"],
            "notes": "Generado automaticamente al marcar factura como pagada",
            "attachments": [], "recurring": False, "recurring_period": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user["user_id"]
        }
        await db.accounting_transactions.insert_one(tx)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
    updated = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    return updated

@router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.invoices.delete_one({"id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return {"message": "Factura eliminada"}

# ============ ACCOUNTING ============

@router.get("/accounting/categories")
async def get_accounting_categories(current_user: dict = Depends(get_current_user)):
    return ACCOUNTING_CATEGORIES

@router.get("/accounting/transactions")
async def get_transactions(type: Optional[str] = None, status: Optional[str] = None, category: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None, search: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if type: query["type"] = type
    if status: query["status"] = status
    if category: query["category"] = category
    if date_from or date_to:
        date_q = {}
        if date_from: date_q["$gte"] = date_from
        if date_to: date_q["$lte"] = date_to
        query["date"] = date_q
    if search:
        query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"reference": {"$regex": search, "$options": "i"}},
            {"contact_name": {"$regex": search, "$options": "i"}}
        ]
    txs = await db.accounting_transactions.find(query, {"_id": 0}).sort("date", -1).to_list(500)
    return txs

@router.get("/accounting/summary")
async def get_accounting_summary(period: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    match_q = {}
    if period:
        now = datetime.now(timezone.utc)
        if period == "month": match_q["date"] = {"$gte": now.strftime("%Y-%m-01")}
        elif period == "quarter":
            q_month = ((now.month - 1) // 3) * 3 + 1
            match_q["date"] = {"$gte": f"{now.year}-{q_month:02d}-01"}
        elif period == "year": match_q["date"] = {"$gte": f"{now.year}-01-01"}
    pipe_inc = [{"$match": {**match_q, "type": "income"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}, "base": {"$sum": "$base_amount"}, "iva": {"$sum": "$iva_amount"}}}]
    pipe_exp = [{"$match": {**match_q, "type": "expense"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}, "base": {"$sum": "$base_amount"}, "iva": {"$sum": "$iva_amount"}}}]
    inc = await db.accounting_transactions.aggregate(pipe_inc).to_list(1)
    exp = await db.accounting_transactions.aggregate(pipe_exp).to_list(1)
    total_income = inc[0]["total"] if inc else 0
    income_base = inc[0]["base"] if inc else 0
    income_iva = inc[0]["iva"] if inc else 0
    total_expenses = exp[0]["total"] if exp else 0
    expense_base = exp[0]["base"] if exp else 0
    expense_iva = exp[0]["iva"] if exp else 0
    pending_pipe = [{"$match": {**match_q, "status": "pending"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    pending = await db.accounting_transactions.aggregate(pending_pipe).to_list(1)
    pending_amount = pending[0]["total"] if pending else 0
    return {
        "total_income": total_income, "total_expenses": total_expenses,
        "net_profit": total_income - total_expenses,
        "income_base": income_base, "income_iva": income_iva,
        "expense_base": expense_base, "expense_iva": expense_iva,
        "iva_balance": income_iva - expense_iva, "pending_amount": pending_amount
    }

@router.get("/accounting/monthly-report")
async def get_monthly_report(year: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    if not year: year = datetime.now(timezone.utc).year
    pipeline = [
        {"$match": {"date": {"$gte": f"{year}-01-01", "$lte": f"{year}-12-31"}}},
        {"$addFields": {"month": {"$substr": ["$date", 5, 2]}}},
        {"$group": {"_id": {"month": "$month", "type": "$type"}, "total": {"$sum": "$amount"}, "base": {"$sum": "$base_amount"}, "iva": {"$sum": "$iva_amount"}, "count": {"$sum": 1}}},
        {"$sort": {"_id.month": 1}}
    ]
    results = await db.accounting_transactions.aggregate(pipeline).to_list(100)
    months = {}
    for r in results:
        m = r["_id"]["month"]
        if m not in months:
            months[m] = {"month": m, "income": 0, "expenses": 0, "income_iva": 0, "expense_iva": 0, "income_count": 0, "expense_count": 0}
        if r["_id"]["type"] == "income":
            months[m]["income"] = r["total"]; months[m]["income_iva"] = r["iva"]; months[m]["income_count"] = r["count"]
        else:
            months[m]["expenses"] = r["total"]; months[m]["expense_iva"] = r["iva"]; months[m]["expense_count"] = r["count"]
    for m in months.values(): m["net"] = m["income"] - m["expenses"]; m["iva_balance"] = m["income_iva"] - m["expense_iva"]
    return sorted(months.values(), key=lambda x: x["month"])

@router.get("/accounting/category-report")
async def get_category_report(period: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    match_q = {}
    if period:
        now = datetime.now(timezone.utc)
        if period == "month": match_q["date"] = {"$gte": now.strftime("%Y-%m-01")}
        elif period == "quarter":
            q_month = ((now.month - 1) // 3) * 3 + 1
            match_q["date"] = {"$gte": f"{now.year}-{q_month:02d}-01"}
        elif period == "year": match_q["date"] = {"$gte": f"{now.year}-01-01"}
    pipeline = [{"$match": match_q}, {"$group": {"_id": {"type": "$type", "category": "$category"}, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}, {"$sort": {"total": -1}}]
    results = await db.accounting_transactions.aggregate(pipeline).to_list(100)
    return [{"type": r["_id"]["type"], "category": r["_id"]["category"] or "sin_categoria", "total": r["total"], "count": r["count"]} for r in results]

@router.get("/accounting/iva-report")
async def get_iva_report(year: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    if not year: year = datetime.now(timezone.utc).year
    quarters = []
    for q in range(1, 5):
        start_m = (q - 1) * 3 + 1
        end_m = q * 3
        start = f"{year}-{start_m:02d}-01"
        end = f"{year}-{end_m:02d}-31"
        pipe = [{"$match": {"date": {"$gte": start, "$lte": end}}}, {"$group": {"_id": "$type", "iva_total": {"$sum": "$iva_amount"}, "base_total": {"$sum": "$base_amount"}, "count": {"$sum": 1}}}]
        results = await db.accounting_transactions.aggregate(pipe).to_list(10)
        q_data = {"quarter": f"Q{q}", "iva_repercutido": 0, "iva_soportado": 0, "base_income": 0, "base_expense": 0, "tx_count": 0}
        for r in results:
            q_data["tx_count"] += r["count"]
            if r["_id"] == "income": q_data["iva_repercutido"] = r["iva_total"]; q_data["base_income"] = r["base_total"]
            elif r["_id"] == "expense": q_data["iva_soportado"] = r["iva_total"]; q_data["base_expense"] = r["base_total"]
        q_data["iva_result"] = q_data["iva_repercutido"] - q_data["iva_soportado"]
        quarters.append(q_data)
    return quarters

@router.post("/accounting/transactions")
async def create_transaction(tx: TransactionCreate, current_user: dict = Depends(get_current_user)):
    tx_dict = tx.model_dump()
    tx_dict["id"] = str(uuid.uuid4())
    tx_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    tx_dict["created_by"] = current_user["user_id"]
    if not tx_dict.get("date"): tx_dict["date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if tx_dict["base_amount"] and tx_dict["iva_rate"] and not tx_dict["iva_amount"]:
        tx_dict["iva_amount"] = round(tx_dict["base_amount"] * tx_dict["iva_rate"] / 100, 2)
    if tx_dict["base_amount"] and not tx_dict["amount"]:
        tx_dict["amount"] = round(tx_dict["base_amount"] + tx_dict["iva_amount"], 2)
    await db.accounting_transactions.insert_one(tx_dict)
    created = await db.accounting_transactions.find_one({"id": tx_dict["id"]}, {"_id": 0})
    return created

@router.put("/accounting/transactions/{tx_id}")
async def update_transaction(tx_id: str, tx: TransactionUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in tx.model_dump().items() if v is not None}
    if not update_data: raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.accounting_transactions.update_one({"id": tx_id}, {"$set": update_data})
    updated = await db.accounting_transactions.find_one({"id": tx_id}, {"_id": 0})
    if not updated: raise HTTPException(status_code=404, detail="Transaccion no encontrada")
    return updated

@router.delete("/accounting/transactions/{tx_id}")
async def delete_transaction(tx_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.accounting_transactions.delete_one({"id": tx_id})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Transaccion no encontrada")
    return {"message": "Transaccion eliminada"}

# ============ SUPPLIER PAYMENTS ============

@router.get("/supplier-payments")
async def get_supplier_payments(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if status: query["status"] = status
    payments = await db.supplier_payments.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    return payments

@router.post("/supplier-payments")
async def create_supplier_payment(pay: SupplierPaymentCreate, current_user: dict = Depends(get_current_user)):
    pay_dict = pay.model_dump()
    pay_dict["id"] = str(uuid.uuid4())
    pay_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    pay_dict["created_by"] = current_user["user_id"]
    await db.supplier_payments.insert_one(pay_dict)
    created = await db.supplier_payments.find_one({"id": pay_dict["id"]}, {"_id": 0})
    return created

@router.put("/supplier-payments/{pay_id}")
async def update_supplier_payment(pay_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    existing = await db.supplier_payments.find_one({"id": pay_id}, {"_id": 0})
    if not existing: raise HTTPException(status_code=404, detail="Pago no encontrado")
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    if body.get("status") == "paid" and existing.get("status") != "paid":
        body["paid_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        tx = {
            "id": str(uuid.uuid4()), "type": "expense",
            "base_amount": body.get("amount", existing.get("amount", 0)),
            "iva_rate": 0, "iva_amount": 0,
            "amount": body.get("amount", existing.get("amount", 0)),
            "description": f"Pago a {existing.get('supplier_name', 'proveedor')}",
            "category": "mercancia", "reference": existing.get("reference", ""),
            "payment_method": body.get("payment_method", existing.get("payment_method", "")),
            "status": "paid", "date": body["paid_date"],
            "contact_id": existing.get("supplier_id", ""),
            "contact_name": existing.get("supplier_name", ""),
            "invoice_id": existing.get("invoice_id", ""),
            "labels": [], "notes": "Pago proveedor auto-generado", "attachments": [],
            "recurring": False, "recurring_period": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user["user_id"]
        }
        await db.accounting_transactions.insert_one(tx)
        body["transaction_id"] = tx["id"]
    await db.supplier_payments.update_one({"id": pay_id}, {"$set": body})
    updated = await db.supplier_payments.find_one({"id": pay_id}, {"_id": 0})
    return updated

@router.delete("/supplier-payments/{pay_id}")
async def delete_supplier_payment(pay_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.supplier_payments.delete_one({"id": pay_id})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Pago no encontrado")
    return {"message": "Pago eliminado"}
