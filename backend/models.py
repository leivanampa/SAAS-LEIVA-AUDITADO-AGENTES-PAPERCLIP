from pydantic import BaseModel
from typing import List, Optional

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "user"

class UserLogin(BaseModel):
    email: str
    password: str

class ContactCreate(BaseModel):
    name: str
    company: str = ""
    email: str = ""
    phone: str = ""
    type: str = "supplier"
    country: str = ""
    notes: str = ""
    tags: List[str] = []
    address: str = ""
    city: str = ""
    province: str = ""
    postal_code: str = ""
    fiscal_id: str = ""
    fiscal_id_type: str = ""
    tax_regime: str = ""
    bank_iban: str = ""
    bank_swift: str = ""
    bank_name: str = ""

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    type: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    fiscal_id: Optional[str] = None
    fiscal_id_type: Optional[str] = None
    tax_regime: Optional[str] = None
    bank_iban: Optional[str] = None
    bank_swift: Optional[str] = None
    bank_name: Optional[str] = None

class ShipmentCreate(BaseModel):
    reference: str
    origin: str = "China"
    destination: str = "Spain"
    supplier_name: str = ""
    product_description: str = ""
    quantity: int = 0
    weight_kg: float = 0
    volume_cbm: float = 0
    shipping_method: str = "sea"
    status: str = "pending"
    estimated_departure: str = ""
    estimated_arrival: str = ""
    tracking_number: str = ""
    container_number: str = ""
    incoterm: str = "FOB"
    notes: str = ""
    cost_eur: float = 0

class ShipmentUpdate(BaseModel):
    reference: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    supplier_name: Optional[str] = None
    product_description: Optional[str] = None
    quantity: Optional[int] = None
    weight_kg: Optional[float] = None
    volume_cbm: Optional[float] = None
    shipping_method: Optional[str] = None
    status: Optional[str] = None
    estimated_departure: Optional[str] = None
    estimated_arrival: Optional[str] = None
    tracking_number: Optional[str] = None
    container_number: Optional[str] = None
    incoterm: Optional[str] = None
    notes: Optional[str] = None
    cost_eur: Optional[float] = None

class StatusEventCreate(BaseModel):
    shipment_id: str
    status: str
    location: str = ""
    description: str = ""

class DocumentCreate(BaseModel):
    name: str
    category: str = "general"
    shipment_id: str = ""
    description: str = ""
    file_url: str = ""
    file_type: str = ""

class InvoiceCreate(BaseModel):
    invoice_number: str
    contact_id: str = ""
    contact_name: str = ""
    type: str = "purchase"
    items: List[dict] = []
    subtotal: float = 0
    tax_rate: float = 21
    tax_amount: float = 0
    total: float = 0
    currency: str = "EUR"
    status: str = "draft"
    due_date: str = ""
    notes: str = ""
    invoice_series: str = ""
    payment_method: str = ""
    sender_name: str = ""
    sender_fiscal_id: str = ""
    sender_address: str = ""
    sender_city: str = ""
    sender_postal_code: str = ""
    sender_country: str = ""
    receiver_name: str = ""
    receiver_fiscal_id: str = ""
    receiver_address: str = ""
    receiver_city: str = ""
    receiver_postal_code: str = ""
    receiver_country: str = ""

class InvoiceUpdate(BaseModel):
    invoice_number: Optional[str] = None
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    type: Optional[str] = None
    items: Optional[List[dict]] = None
    subtotal: Optional[float] = None
    tax_rate: Optional[float] = None
    tax_amount: Optional[float] = None
    total: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None
    invoice_series: Optional[str] = None
    payment_method: Optional[str] = None
    sender_name: Optional[str] = None
    sender_fiscal_id: Optional[str] = None
    sender_address: Optional[str] = None
    sender_city: Optional[str] = None
    sender_postal_code: Optional[str] = None
    sender_country: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_fiscal_id: Optional[str] = None
    receiver_address: Optional[str] = None
    receiver_city: Optional[str] = None
    receiver_postal_code: Optional[str] = None
    receiver_country: Optional[str] = None

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "info"
    link: str = ""

class ImportCreate(BaseModel):
    reference: str
    name: str

class CostEstimatorInput(BaseModel):
    product_value: float = 0
    freight_cost: float = 0
    insurance_cost: float = 0
    tariff_rate: float = 0
    vat_rate: float = 21
    other_costs: float = 0
    margin_percent: float = 0

class TransactionCreate(BaseModel):
    type: str = "expense"
    base_amount: float = 0
    iva_rate: float = 21
    iva_amount: float = 0
    amount: float = 0
    description: str = ""
    category: str = ""
    subcategory: str = ""
    reference: str = ""
    payment_method: str = ""
    status: str = "pending"
    date: str = ""
    due_date: str = ""
    contact_id: str = ""
    contact_name: str = ""
    invoice_id: str = ""
    labels: List[str] = []
    notes: str = ""
    attachments: List[dict] = []
    recurring: bool = False
    recurring_period: str = ""

class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    base_amount: Optional[float] = None
    iva_rate: Optional[float] = None
    iva_amount: Optional[float] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    reference: Optional[str] = None
    payment_method: Optional[str] = None
    status: Optional[str] = None
    date: Optional[str] = None
    due_date: Optional[str] = None
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    invoice_id: Optional[str] = None
    labels: Optional[List[str]] = None
    notes: Optional[str] = None
    attachments: Optional[List[dict]] = None

class SupplierPaymentCreate(BaseModel):
    supplier_id: str = ""
    supplier_name: str = ""
    amount: float = 0
    currency: str = "EUR"
    status: str = "scheduled"
    payment_method: str = ""
    due_date: str = ""
    paid_date: str = ""
    reference: str = ""
    invoice_id: str = ""
    transaction_id: str = ""
    notes: str = ""

class WarehouseCreate(BaseModel):
    name: str
    address: str = ""
    city: str = ""
    province: str = ""
    postal_code: str = ""
    country: str = "Spain"
    capacity: str = ""
    contact_name: str = ""
    contact_phone: str = ""
    notes: str = ""

class AutomationRule(BaseModel):
    name: str
    trigger_stage: int
    action_type: str = "notification"
    email_to: str = ""
    email_subject_template: str = ""
    email_body_template: str = ""
    notification_message: str = ""
    active: bool = True

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class QuoteRequestCreate(BaseModel):
        name: str
        company: str = ""
        email: str
        phone: str = ""
        services: List[str] = []
        message: str = ""

# ============ AGENT MODELS ============

class AgentTaskCreate(BaseModel):
    agent_id: str
    task_type: str
    context: dict = {}
    priority: str = "normal"
    triggered_by: str = ""

class AgentTaskResult(BaseModel):
    status: str
    result: dict = {}
    error: str = ""
    tokens_used: int = 0
    cost_usd: float = 0.0
    duration_ms: int = 0

class AgentApprovalAction(BaseModel):
    reviewer_notes: str = ""

class AgentBudgetConfig(BaseModel):
    agent_id: str
    # Monthly API cost limit in USD (Claude tokens)
    monthly_api_limit_usd: float = 10.0
    # Per-task maximum cost in USD
    per_task_limit_usd: float = 1.0
    # Financial action limits — any payment/transfer proposed by the agent
    financial_action_limit_eur: float = 0.0   # 0 = requires approval for ANY amount
    # Whether this agent is allowed to propose payments at all
    can_propose_payments: bool = False
    # Alert threshold: send notification when monthly spend reaches this % of limit
    alert_threshold_pct: float = 80.0
    active: bool = True

class FinancialApprovalCreate(BaseModel):
    """Posted by agents when they want to propose a financial action."""
    agent_id: str
    action_type: str          # supplier_payment, invoice_payment, transfer, purchase
    description: str
    amount_eur: float
    currency: str = "EUR"
    recipient: str = ""       # supplier name / contact
    reference: str = ""       # invoice number / import reference
    context: dict = {}        # full context for the reviewer

class ActivityEvent(BaseModel):
    """Posted by agents/orchestrator to the activity feed."""
    agent_id: str
    event_type: str           # task_started, task_completed, tool_called, error, budget_alert, approval_requested
    title: str
    detail: str = ""
    severity: str = "info"    # info, warning, error, success
    task_id: str = ""
    metadata: dict = {}
