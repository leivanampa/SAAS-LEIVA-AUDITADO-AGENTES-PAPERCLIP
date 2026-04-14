from fastapi import APIRouter, Depends
from db import db, get_current_user

router = APIRouter()

@router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    total_contacts = await db.contacts.count_documents({})
    total_shipments = await db.shipments.count_documents({})
    active_shipments = await db.shipments.count_documents({"status": {"$in": ["in_transit", "customs"]}})
    pending_shipments = await db.shipments.count_documents({"status": "pending"})
    delivered_shipments = await db.shipments.count_documents({"status": "delivered"})
    total_invoices = await db.invoices.count_documents({})
    pending_invoices = await db.invoices.count_documents({"status": {"$in": ["draft", "sent"]}})
    paid_invoices = await db.invoices.count_documents({"status": "paid"})
    total_documents = await db.documents.count_documents({})
    unread_notifications = await db.notifications.count_documents({"read": False, "user_id": current_user["user_id"]})
    total_imports = await db.imports.count_documents({})
    active_imports = await db.imports.count_documents({"locked": False, "current_stage": {"$lt": 9}})

    pipeline = [{"$match": {"status": "paid"}}, {"$group": {"_id": None, "total": {"$sum": "$total"}}}]
    revenue_result = await db.invoices.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0

    pipeline_pending = [{"$match": {"status": {"$in": ["sent", "draft"]}}}, {"$group": {"_id": None, "total": {"$sum": "$total"}}}]
    pending_result = await db.invoices.aggregate(pipeline_pending).to_list(1)
    pending_amount = pending_result[0]["total"] if pending_result else 0

    return {
        "total_contacts": total_contacts, "total_shipments": total_shipments,
        "active_shipments": active_shipments, "pending_shipments": pending_shipments,
        "delivered_shipments": delivered_shipments, "total_invoices": total_invoices,
        "pending_invoices": pending_invoices, "paid_invoices": paid_invoices,
        "total_documents": total_documents, "unread_notifications": unread_notifications,
        "total_revenue": total_revenue, "pending_amount": pending_amount,
        "total_imports": total_imports, "active_imports": active_imports
    }

@router.get("/dashboard/recent-activity")
async def get_recent_activity(current_user: dict = Depends(get_current_user)):
    recent_shipments = await db.shipments.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_invoices = await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_contacts = await db.contacts.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    return {"recent_shipments": recent_shipments, "recent_invoices": recent_invoices, "recent_contacts": recent_contacts}
