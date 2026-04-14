import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from db import db
from models import QuoteRequestCreate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contact", tags=["contact"])

NOTIFY_EMAIL = "info@leivasimport.com"

# SMTP config from environment variables
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "noreply@leivasimport.com")


async def get_next_quote_number() -> int:
      """Get and increment the progressive quote counter from MongoDB."""
      result = await db.counters.find_one_and_update(
          {"_id": "quote_number"},
          {"$inc": {"seq": 1}},
          upsert=True,
          return_document=True
      )
      return result["seq"]


def send_notification_email(quote_number: int, data: dict):
      """Send email notification via SMTP."""
      if not SMTP_HOST or not SMTP_USER:
                logger.warning("SMTP not configured, skipping email notification")
                return False

      subject = f"Solicitud de Cotizacion {quote_number}"

    services_text = ", ".join(data.get("services", [])) or "No especificado"

    body = f"""
    =====================================================
         NUEVA SOLICITUD DE COTIZACION #{quote_number}
         =====================================================

         DATOS DEL INTERESADO:
         -----------------------------------------------------
         Nombre:    {data.get('name', 'N/A')}
         Empresa:   {data.get('company', 'N/A') or 'No especificada'}
         Email:     {data.get('email', 'N/A')}
         Telefono:  {data.get('phone', 'N/A') or 'No proporcionado'}

         SERVICIOS DE INTERES:
         -----------------------------------------------------
         {services_text}

         MENSAJE:
         -----------------------------------------------------
         {data.get('message', 'Sin mensaje adicional') or 'Sin mensaje adicional'}

         -----------------------------------------------------
         Fecha: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M UTC')}
         =====================================================
         """

    try:
              msg = MIMEMultipart()
              msg["From"] = SMTP_FROM
              msg["To"] = NOTIFY_EMAIL
              msg["Subject"] = subject
              msg.attach(MIMEText(body, "plain", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                      server.starttls()
                      server.login(SMTP_USER, SMTP_PASS)
                      server.sendmail(SMTP_FROM, NOTIFY_EMAIL, msg.as_string())

        logger.info(f"Email sent for quote #{quote_number}")
        return True
except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


@router.post("/quote")
async def submit_quote_request(data: QuoteRequestCreate):
      """Public endpoint - no auth required. Receives contact form data,
          stores in MongoDB, sends notification email to info@leivasimport.com."""

    quote_number = await get_next_quote_number()

    record = {
              "quote_number": quote_number,
              "name": data.name,
              "company": data.company,
              "email": data.email,
              "phone": data.phone,
              "services": data.services,
              "message": data.message,
              "status": "new",
              "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await db.quote_requests.insert_one(record)

    # Send email notification
    email_sent = send_notification_email(quote_number, record)

    return {
              "success": True,
              "quote_number": quote_number,
              "message": f"Solicitud de Cotizacion {quote_number} recibida correctamente",
              "email_sent": email_sent,
              "id": str(result.inserted_id)
    }


@router.get("/quotes")
async def list_quote_requests():
      """List all quote requests (for admin panel)."""
      quotes = []
      async for q in db.quote_requests.find().sort("created_at", -1):
                q["_id"] = str(q["_id"])
                quotes.append(q)
            return quotes
