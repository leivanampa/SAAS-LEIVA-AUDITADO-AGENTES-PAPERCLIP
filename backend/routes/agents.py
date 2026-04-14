"""
Agent Bridge API — /api/agents/*

Connects the SaaS to the external agents ecosystem (Paperclip orchestrator).
Two auth modes:
  - X-Agent-Key header  →  orchestrator/agents posting results back
  - JWT Bearer (admin)  →  human operators viewing dashboard / manually triggering
"""
import asyncio
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, AsyncGenerator

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi import Request
from fastapi.responses import StreamingResponse

from db import db, get_agent_auth, get_current_user
from models import (
    AgentTaskCreate, AgentTaskResult, AgentApprovalAction,
    AgentBudgetConfig, FinancialApprovalCreate, ActivityEvent,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])

# ─────────────────────────────────────────────
# TASK ENDPOINTS
# ─────────────────────────────────────────────

@router.post("/tasks", status_code=201)
async def create_task(
    body: AgentTaskCreate,
    auth: dict = Depends(get_agent_auth),
):
    """Manually create a new agent task (admin or orchestrator)."""
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    task = {
        "task_id": task_id,
        "agent_id": body.agent_id,
        "task_type": body.task_type,
        "context": body.context,
        "priority": body.priority,
        "triggered_by": body.triggered_by or auth.get("auth_type", "manual"),
        "status": "queued",
        "result": {},
        "error": "",
        "tokens_used": 0,
        "cost_usd": 0.0,
        "duration_ms": 0,
        "created_at": now,
        "started_at": None,
        "completed_at": None,
    }
    await db.agent_tasks.insert_one(task)
    logger.info(f"Agent task created: {task_id} ({body.agent_id} / {body.task_type})")
    return {"task_id": task_id, "status": "queued"}


@router.get("/tasks")
async def list_tasks(
    agent_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    auth: dict = Depends(get_agent_auth),
):
    """List agent tasks with optional filters."""
    query: dict = {}
    if agent_id:
        query["agent_id"] = agent_id
    if status:
        query["status"] = status
    cursor = db.agent_tasks.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    tasks = await cursor.to_list(length=limit)
    return tasks


@router.get("/tasks/{task_id}")
async def get_task(task_id: str, auth: dict = Depends(get_agent_auth)):
    """Get a single task with full result and logs."""
    task = await db.agent_tasks.find_one({"task_id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return task


@router.put("/tasks/{task_id}/result")
async def post_task_result(
    task_id: str,
    body: AgentTaskResult,
    auth: dict = Depends(get_agent_auth),
):
    """
    Called by the orchestrator when an agent finishes.
    Updates task status, result, tokens, and cost.
    """
    task = await db.agent_tasks.find_one({"task_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    now = datetime.now(timezone.utc).isoformat()
    update = {
        "status": body.status,
        "result": body.result,
        "error": body.error,
        "tokens_used": body.tokens_used,
        "cost_usd": body.cost_usd,
        "duration_ms": body.duration_ms,
        "completed_at": now,
    }
    await db.agent_tasks.update_one({"task_id": task_id}, {"$set": update})
    logger.info(f"Task {task_id} → {body.status} ({body.tokens_used} tokens, ${body.cost_usd:.4f})")
    return {"ok": True}


@router.post("/tasks/{task_id}/retry")
async def retry_task(task_id: str, auth: dict = Depends(get_agent_auth)):
    """Re-queue a failed task."""
    task = await db.agent_tasks.find_one({"task_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    if task["status"] not in ("failed", "cancelled"):
        raise HTTPException(status_code=400, detail="Solo se pueden reintentar tareas fallidas o canceladas")
    await db.agent_tasks.update_one(
        {"task_id": task_id},
        {"$set": {"status": "queued", "error": "", "started_at": None, "completed_at": None}},
    )
    return {"task_id": task_id, "status": "queued"}


@router.delete("/tasks/{task_id}")
async def cancel_task(task_id: str, auth: dict = Depends(get_agent_auth)):
    """Cancel a pending task."""
    task = await db.agent_tasks.find_one({"task_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    if task["status"] != "queued":
        raise HTTPException(status_code=400, detail="Solo se pueden cancelar tareas en cola")
    await db.agent_tasks.update_one({"task_id": task_id}, {"$set": {"status": "cancelled"}})
    return {"ok": True}


# ─────────────────────────────────────────────
# LOGS ENDPOINT
# ─────────────────────────────────────────────

@router.get("/logs/{task_id}")
async def get_task_logs(task_id: str, auth: dict = Depends(get_agent_auth)):
    """Per-task execution log entries."""
    cursor = db.agent_logs.find({"task_id": task_id}, {"_id": 0}).sort("timestamp", 1)
    logs = await cursor.to_list(length=500)
    return logs


# ─────────────────────────────────────────────
# STATUS ENDPOINT
# ─────────────────────────────────────────────

@router.get("/status")
async def agents_status(auth: dict = Depends(get_agent_auth)):
    """
    Summary of all registered agents: last run, success rate, daily cost.
    """
    pipeline = [
        {
            "$group": {
                "_id": "$agent_id",
                "total": {"$sum": 1},
                "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
                "failed": {"$sum": {"$cond": [{"$eq": ["$status", "failed"]}, 1, 0]}},
                "total_cost_usd": {"$sum": "$cost_usd"},
                "total_tokens": {"$sum": "$tokens_used"},
                "last_run": {"$max": "$completed_at"},
            }
        }
    ]
    results = await db.agent_tasks.aggregate(pipeline).to_list(length=20)
    status_map = {}
    for r in results:
        agent_id = r.pop("_id")
        r["success_rate"] = round(r["completed"] / r["total"] * 100, 1) if r["total"] > 0 else 0
        status_map[agent_id] = r
    return status_map


# ─────────────────────────────────────────────
# WEBHOOK RECEIVER (n8n → orchestrator pass-through)
# ─────────────────────────────────────────────

@router.post("/webhook")
async def receive_webhook(request: Request, auth: dict = Depends(get_agent_auth)):
    """
    Receives raw events from n8n or other external triggers.
    Creates a queued task and returns task_id immediately.
    The orchestrator polls for queued tasks or the SaaS emits separately.
    """
    body = await request.json()
    agent_id = body.get("agent_id", "ceo-agent")
    task_type = body.get("task_type", "webhook_event")
    context = body.get("context", {})
    triggered_by = body.get("triggered_by", "webhook")

    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    task = {
        "task_id": task_id,
        "agent_id": agent_id,
        "task_type": task_type,
        "context": context,
        "priority": body.get("priority", "normal"),
        "triggered_by": triggered_by,
        "status": "queued",
        "result": {},
        "error": "",
        "tokens_used": 0,
        "cost_usd": 0.0,
        "duration_ms": 0,
        "created_at": now,
        "started_at": None,
        "completed_at": None,
    }
    await db.agent_tasks.insert_one(task)
    logger.info(f"Webhook task created: {task_id} ({agent_id} / {task_type})")
    return {"task_id": task_id, "status": "queued"}


# ─────────────────────────────────────────────
# HUMAN APPROVAL ENDPOINTS
# ─────────────────────────────────────────────

@router.get("/approvals")
async def list_approvals(auth: dict = Depends(get_agent_auth)):
    """List pending agent approvals (emails, financial actions)."""
    cursor = db.agent_pending_approvals.find(
        {"status": "pending"}, {"_id": 0}
    ).sort("created_at", -1)
    return await cursor.to_list(length=100)


@router.post("/approvals/{approval_id}/approve")
async def approve_action(
    approval_id: str,
    body: AgentApprovalAction,
    auth: dict = Depends(get_agent_auth),
):
    """Human approves a pending agent action. Marks it approved so orchestrator can execute."""
    doc = await db.agent_pending_approvals.find_one({"approval_id": approval_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Aprobacion no encontrada")
    if doc["status"] != "pending":
        raise HTTPException(status_code=400, detail="Esta aprobacion ya fue procesada")
    now = datetime.now(timezone.utc).isoformat()
    await db.agent_pending_approvals.update_one(
        {"approval_id": approval_id},
        {"$set": {
            "status": "approved",
            "reviewed_at": now,
            "reviewer_notes": body.reviewer_notes,
            "reviewed_by": auth.get("user_id", auth.get("agent_id", "unknown")),
        }},
    )
    return {"ok": True, "status": "approved"}


@router.post("/approvals/{approval_id}/reject")
async def reject_action(
    approval_id: str,
    body: AgentApprovalAction,
    auth: dict = Depends(get_agent_auth),
):
    """Human rejects a pending agent action."""
    doc = await db.agent_pending_approvals.find_one({"approval_id": approval_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Aprobacion no encontrada")
    if doc["status"] != "pending":
        raise HTTPException(status_code=400, detail="Esta aprobacion ya fue procesada")
    now = datetime.now(timezone.utc).isoformat()
    await db.agent_pending_approvals.update_one(
        {"approval_id": approval_id},
        {"$set": {
            "status": "rejected",
            "reviewed_at": now,
            "reviewer_notes": body.reviewer_notes,
            "reviewed_by": auth.get("user_id", auth.get("agent_id", "unknown")),
        }},
    )
    # Emit activity event
    await _emit_activity(
        agent_id=doc.get("agent_id", "unknown"),
        event_type="approval_rejected",
        title=f"Acción rechazada: {doc.get('type','?')}",
        detail=body.reviewer_notes or "Rechazado por el propietario",
        severity="warning",
    )
    return {"ok": True, "status": "rejected"}


# ─────────────────────────────────────────────
# BUDGET CONTROL ENDPOINTS
# ─────────────────────────────────────────────

DEFAULT_BUDGETS = {
    "ceo-agent":       {"monthly_api_limit_usd": 20.0, "per_task_limit_usd": 2.0,  "financial_action_limit_eur": 0.0, "can_propose_payments": False},
    "logistics-agent": {"monthly_api_limit_usd": 15.0, "per_task_limit_usd": 1.0,  "financial_action_limit_eur": 0.0, "can_propose_payments": False},
    "imports-agent":   {"monthly_api_limit_usd": 15.0, "per_task_limit_usd": 1.0,  "financial_action_limit_eur": 0.0, "can_propose_payments": False},
    "suppliers-agent": {"monthly_api_limit_usd": 10.0, "per_task_limit_usd": 0.75, "financial_action_limit_eur": 0.0, "can_propose_payments": True},
    "finance-agent":   {"monthly_api_limit_usd": 10.0, "per_task_limit_usd": 0.75, "financial_action_limit_eur": 0.0, "can_propose_payments": True},
    "customer-agent":  {"monthly_api_limit_usd": 10.0, "per_task_limit_usd": 0.5,  "financial_action_limit_eur": 0.0, "can_propose_payments": False},
}


@router.get("/budgets")
async def list_budgets(auth: dict = Depends(get_agent_auth)):
    """
    Return budget config + current month spend for all agents.
    Auto-initialises defaults for agents that have no config yet.
    """
    # Current month spend per agent
    month_start = datetime.now(timezone.utc).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    ).isoformat()
    spend_pipeline = [
        {"$match": {"completed_at": {"$gte": month_start}, "status": "completed"}},
        {"$group": {"_id": "$agent_id", "spent_usd": {"$sum": "$cost_usd"}, "task_count": {"$sum": 1}}},
    ]
    spend_results = await db.agent_tasks.aggregate(spend_pipeline).to_list(20)
    spend_map = {r["_id"]: {"spent_usd": round(r["spent_usd"], 6), "task_count": r["task_count"]} for r in spend_results}

    result = []
    for agent_id, defaults in DEFAULT_BUDGETS.items():
        doc = await db.agent_budgets.find_one({"agent_id": agent_id}, {"_id": 0})
        if not doc:
            doc = {"agent_id": agent_id, **defaults, "alert_threshold_pct": 80.0, "active": True}
        spend = spend_map.get(agent_id, {"spent_usd": 0.0, "task_count": 0})
        doc["current_month_spent_usd"] = spend["spent_usd"]
        doc["current_month_tasks"] = spend["task_count"]
        limit = doc.get("monthly_api_limit_usd", 10.0)
        doc["usage_pct"] = round(spend["spent_usd"] / limit * 100, 1) if limit > 0 else 0
        doc["limit_exceeded"] = spend["spent_usd"] >= limit
        result.append(doc)
    return result


@router.put("/budgets/{agent_id}")
async def update_budget(
    agent_id: str,
    body: AgentBudgetConfig,
    auth: dict = Depends(get_agent_auth),
):
    """Update or create budget configuration for an agent."""
    if agent_id not in DEFAULT_BUDGETS:
        raise HTTPException(status_code=404, detail=f"Agente '{agent_id}' no encontrado")
    now = datetime.now(timezone.utc).isoformat()
    config = body.dict()
    config["agent_id"] = agent_id
    config["updated_at"] = now
    await db.agent_budgets.update_one(
        {"agent_id": agent_id},
        {"$set": config},
        upsert=True,
    )
    await _emit_activity(
        agent_id=agent_id,
        event_type="budget_updated",
        title=f"Presupuesto actualizado: {agent_id}",
        detail=f"Límite mensual: ${body.monthly_api_limit_usd} · Límite financiero: €{body.financial_action_limit_eur}",
        severity="info",
    )
    return {"ok": True, "agent_id": agent_id}


@router.get("/budgets/{agent_id}/check")
async def check_budget(agent_id: str, auth: dict = Depends(get_agent_auth)):
    """
    Check if an agent is within its API cost budget for the current month.
    Returns {allowed: bool, spent_usd, limit_usd, remaining_usd}.
    """
    month_start = datetime.now(timezone.utc).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    ).isoformat()
    spent_agg = await db.agent_tasks.aggregate([
        {"$match": {"agent_id": agent_id, "completed_at": {"$gte": month_start}, "status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$cost_usd"}}},
    ]).to_list(1)
    spent = spent_agg[0]["total"] if spent_agg else 0.0

    doc = await db.agent_budgets.find_one({"agent_id": agent_id}, {"_id": 0})
    limit = doc.get("monthly_api_limit_usd", DEFAULT_BUDGETS.get(agent_id, {}).get("monthly_api_limit_usd", 10.0)) if doc else DEFAULT_BUDGETS.get(agent_id, {}).get("monthly_api_limit_usd", 10.0)

    return {
        "allowed": spent < limit,
        "spent_usd": round(spent, 6),
        "limit_usd": limit,
        "remaining_usd": round(max(0, limit - spent), 6),
    }


# ─────────────────────────────────────────────
# FINANCIAL APPROVAL ENDPOINTS
# Any agent that wants to propose a REAL MONEY action (payment, transfer)
# MUST go through this flow first. Nothing gets executed without owner approval.
# ─────────────────────────────────────────────

@router.post("/financial-approvals", status_code=201)
async def request_financial_approval(
    body: FinancialApprovalCreate,
    auth: dict = Depends(get_agent_auth),
):
    """
    Agent requests owner approval for a financial action.
    ALL money movements require this — there are no auto-approved financial actions.
    Returns approval_id. The action is BLOCKED until the owner approves via the dashboard.
    """
    # Check if agent is allowed to propose payments
    doc = await db.agent_budgets.find_one({"agent_id": body.agent_id})
    defaults = DEFAULT_BUDGETS.get(body.agent_id, {})
    can_propose = doc.get("can_propose_payments", defaults.get("can_propose_payments", False)) if doc else defaults.get("can_propose_payments", False)
    if not can_propose:
        raise HTTPException(
            status_code=403,
            detail=f"El agente '{body.agent_id}' no tiene permiso para proponer pagos."
        )

    approval_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    approval = {
        "approval_id": approval_id,
        "type": "financial_action",
        "action_type": body.action_type,
        "agent_id": body.agent_id,
        "status": "pending",
        "description": body.description,
        "amount_eur": body.amount_eur,
        "currency": body.currency,
        "recipient": body.recipient,
        "reference": body.reference,
        "context": body.context,
        "created_at": now,
        "reviewed_at": None,
        "reviewed_by": None,
        "reviewer_notes": "",
        "urgency": "high",
    }
    await db.agent_pending_approvals.insert_one(approval)

    # Notify admin via SaaS notification
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": "all",
        "title": f"💶 Aprobación financiera requerida: €{body.amount_eur:,.2f}",
        "message": f"{body.description} | Agente: {body.agent_id} | Destinatario: {body.recipient or 'N/A'}",
        "type": "warning",
        "read": False,
        "created_at": now,
        "created_by": "agent-system",
        "link": "/control-center",
    })

    await _emit_activity(
        agent_id=body.agent_id,
        event_type="financial_approval_requested",
        title=f"💶 Aprobación requerida: {body.action_type}",
        detail=f"€{body.amount_eur:,.2f} → {body.recipient or 'destinatario'} | {body.description}",
        severity="warning",
        metadata={"amount_eur": body.amount_eur, "approval_id": approval_id},
    )

    logger.warning(f"Financial approval requested: {approval_id} by {body.agent_id} for €{body.amount_eur}")
    return {"approval_id": approval_id, "status": "pending", "message": "Acción financiera bloqueada hasta aprobación del propietario."}


@router.get("/financial-approvals")
async def list_financial_approvals(
    status: Optional[str] = Query(None),
    auth: dict = Depends(get_agent_auth),
):
    """List financial approvals (all or filtered by status)."""
    query: dict = {"type": "financial_action"}
    if status:
        query["status"] = status
    cursor = db.agent_pending_approvals.find(query, {"_id": 0}).sort("created_at", -1).limit(100)
    return await cursor.to_list(length=100)


@router.post("/financial-approvals/{approval_id}/approve")
async def approve_financial_action(
    approval_id: str,
    body: AgentApprovalAction,
    auth: dict = Depends(get_agent_auth),
):
    """
    Owner approves a financial action. This unblocks the agent to proceed.
    The orchestrator polls for approved financial approvals and executes them.
    """
    doc = await db.agent_pending_approvals.find_one({"approval_id": approval_id, "type": "financial_action"})
    if not doc:
        raise HTTPException(status_code=404, detail="Aprobación financiera no encontrada")
    if doc["status"] != "pending":
        raise HTTPException(status_code=400, detail="Esta aprobación ya fue procesada")

    now = datetime.now(timezone.utc).isoformat()
    reviewer = auth.get("user_id", "admin")
    await db.agent_pending_approvals.update_one(
        {"approval_id": approval_id},
        {"$set": {"status": "approved", "reviewed_at": now, "reviewer_notes": body.reviewer_notes, "reviewed_by": reviewer}},
    )
    await _emit_activity(
        agent_id=doc["agent_id"],
        event_type="financial_approved",
        title=f"✅ Pago aprobado: €{doc['amount_eur']:,.2f}",
        detail=f"{doc['description']} | Aprobado por: {reviewer}",
        severity="success",
        metadata={"amount_eur": doc["amount_eur"], "approval_id": approval_id},
    )
    logger.info(f"Financial approval {approval_id} APPROVED by {reviewer}")
    return {"ok": True, "status": "approved"}


@router.post("/financial-approvals/{approval_id}/reject")
async def reject_financial_action(
    approval_id: str,
    body: AgentApprovalAction,
    auth: dict = Depends(get_agent_auth),
):
    """Owner rejects a financial action. The agent will NOT proceed."""
    doc = await db.agent_pending_approvals.find_one({"approval_id": approval_id, "type": "financial_action"})
    if not doc:
        raise HTTPException(status_code=404, detail="Aprobación financiera no encontrada")
    if doc["status"] != "pending":
        raise HTTPException(status_code=400, detail="Esta aprobación ya fue procesada")

    now = datetime.now(timezone.utc).isoformat()
    reviewer = auth.get("user_id", "admin")
    await db.agent_pending_approvals.update_one(
        {"approval_id": approval_id},
        {"$set": {"status": "rejected", "reviewed_at": now, "reviewer_notes": body.reviewer_notes, "reviewed_by": reviewer}},
    )
    await _emit_activity(
        agent_id=doc["agent_id"],
        event_type="financial_rejected",
        title=f"❌ Pago rechazado: €{doc['amount_eur']:,.2f}",
        detail=body.reviewer_notes or "Rechazado por el propietario",
        severity="error",
        metadata={"amount_eur": doc["amount_eur"], "approval_id": approval_id},
    )
    logger.info(f"Financial approval {approval_id} REJECTED by {reviewer}")
    return {"ok": True, "status": "rejected"}


# ─────────────────────────────────────────────
# ACTIVITY FEED — Real-time event stream
# ─────────────────────────────────────────────

async def _emit_activity(
    agent_id: str,
    event_type: str,
    title: str,
    detail: str = "",
    severity: str = "info",
    task_id: str = "",
    metadata: dict = None,
) -> None:
    """Internal helper: write an event to the activity feed collection."""
    await db.agent_activity_feed.insert_one({
        "event_id": str(uuid.uuid4()),
        "agent_id": agent_id,
        "event_type": event_type,
        "title": title,
        "detail": detail,
        "severity": severity,
        "task_id": task_id,
        "metadata": metadata or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


@router.post("/activity")
async def post_activity_event(
    body: ActivityEvent,
    auth: dict = Depends(get_agent_auth),
):
    """Agents/orchestrator post activity events here (task steps, tool calls, errors)."""
    await _emit_activity(
        agent_id=body.agent_id,
        event_type=body.event_type,
        title=body.title,
        detail=body.detail,
        severity=body.severity,
        task_id=body.task_id,
        metadata=body.metadata,
    )
    return {"ok": True}


@router.get("/activity")
async def get_activity_feed(
    limit: int = Query(100, le=500),
    agent_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    since: Optional[str] = Query(None),
    auth: dict = Depends(get_agent_auth),
):
    """Get recent activity events, newest first."""
    query: dict = {}
    if agent_id:
        query["agent_id"] = agent_id
    if severity:
        query["severity"] = severity
    if since:
        query["timestamp"] = {"$gte": since}
    cursor = db.agent_activity_feed.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit)
    return await cursor.to_list(length=limit)


@router.get("/activity/stream")
async def activity_stream(request: Request, auth: dict = Depends(get_agent_auth)):
    """
    Server-Sent Events stream for real-time activity feed.
    The dashboard connects here and receives push updates as agents act.
    """
    async def event_generator() -> AsyncGenerator[str, None]:
        # Send initial ping
        yield "data: {\"type\":\"connected\"}\n\n"
        last_id = None
        # Get the most recent event ID to start from
        latest = await db.agent_activity_feed.find_one({}, {"event_id": 1}, sort=[("timestamp", -1)])
        if latest:
            last_id = latest.get("event_id")

        while True:
            if await request.is_disconnected():
                break
            query: dict = {}
            if last_id:
                # Fetch events newer than the last one we sent
                last_doc = await db.agent_activity_feed.find_one({"event_id": last_id})
                if last_doc:
                    query["timestamp"] = {"$gt": last_doc["timestamp"]}
            new_events = await db.agent_activity_feed.find(
                query, {"_id": 0}
            ).sort("timestamp", 1).to_list(50)

            for event in new_events:
                import json
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                last_id = event["event_id"]

            await asyncio.sleep(2)  # poll every 2 seconds

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ─────────────────────────────────────────────
# CONTROL CENTER SUMMARY ENDPOINT
# Single endpoint that powers the 360° dashboard
# ─────────────────────────────────────────────

@router.get("/control-center/summary")
async def control_center_summary(auth: dict = Depends(get_agent_auth)):
    """
    Returns everything the 360° Control Center needs in one call:
    - Active tasks (running right now)
    - Pending financial approvals (URGENT)
    - Pending email drafts
    - Budget status all agents
    - Recent activity (last 30 events)
    - Error summary (last 24h)
    - Cost summary (today + this month)
    """
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    last_24h = (now - timedelta(hours=24)).isoformat()

    # Run all queries concurrently
    (
        running_tasks,
        financial_pending,
        email_drafts_pending,
        recent_activity,
        errors_24h,
        today_cost_agg,
        month_cost_agg,
        failed_tasks_24h,
    ) = await asyncio.gather(
        db.agent_tasks.find({"status": "running"}, {"_id": 0}).to_list(20),
        db.agent_pending_approvals.find({"type": "financial_action", "status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(50),
        db.agent_pending_approvals.find({"type": "email_draft", "status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(50),
        db.agent_activity_feed.find({}, {"_id": 0}).sort("timestamp", -1).limit(50).to_list(50),
        db.agent_activity_feed.find({"severity": "error", "timestamp": {"$gte": last_24h}}, {"_id": 0}).sort("timestamp", -1).to_list(20),
        db.agent_tasks.aggregate([
            {"$match": {"completed_at": {"$gte": today_start}, "status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$cost_usd"}, "tasks": {"$sum": 1}}},
        ]).to_list(1),
        db.agent_tasks.aggregate([
            {"$match": {"completed_at": {"$gte": month_start}, "status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$cost_usd"}, "tasks": {"$sum": 1}}},
        ]).to_list(1),
        db.agent_tasks.find({"status": "failed", "completed_at": {"$gte": last_24h}}, {"_id": 0}).sort("completed_at", -1).to_list(20),
    )

    # Budget status
    budgets_raw = await list_budgets(auth=auth)

    return {
        "running_tasks": running_tasks,
        "financial_approvals_pending": financial_pending,
        "email_drafts_pending": email_drafts_pending,
        "recent_activity": recent_activity,
        "errors_24h": errors_24h,
        "failed_tasks_24h": failed_tasks_24h,
        "budgets": budgets_raw,
        "costs": {
            "today_usd": round(today_cost_agg[0]["total"] if today_cost_agg else 0, 6),
            "today_tasks": today_cost_agg[0]["tasks"] if today_cost_agg else 0,
            "month_usd": round(month_cost_agg[0]["total"] if month_cost_agg else 0, 6),
            "month_tasks": month_cost_agg[0]["tasks"] if month_cost_agg else 0,
        },
        "alerts": {
            "financial_pending_count": len(financial_pending),
            "email_drafts_count": len(email_drafts_pending),
            "errors_24h_count": len(errors_24h),
            "running_count": len(running_tasks),
            "budget_exceeded": [b["agent_id"] for b in budgets_raw if b.get("limit_exceeded")],
        },
    }
