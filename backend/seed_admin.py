"""
Seed script — Creates the initial admin user for SAAS-LEIVAS.
Run once after first deployment:

    python seed_admin.py

Requires .env to be configured with MONGO_URL, DB_NAME, and JWT_SECRET.
"""
import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load env from backend directory
load_dotenv(Path(__file__).parent / '.env')

from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
from datetime import datetime, timezone
import uuid

# Configuration
ADMIN_EMAIL = "info@leivasimport.com"
ADMIN_NAME = "Ivan Leiva (Admin)"
ADMIN_PASSWORD = "Hq43ngfdGeXie&qxmsLR"

# ⚠️  IMPORTANT: Change this password after first login!
# Go to Settings > Profile in the app, or use the forgot-password flow.


async def seed():
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')

    if not mongo_url or not db_name:
        print("ERROR: MONGO_URL and DB_NAME must be set in .env")
        sys.exit(1)

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Check if admin already exists
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if existing:
        print(f"Admin user '{ADMIN_EMAIL}' already exists. Skipping.")
        client.close()
        return

    # Create admin user
    hashed = bcrypt.hashpw(ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    admin_user = {
        "id": str(uuid.uuid4()),
        "name": ADMIN_NAME,
        "email": ADMIN_EMAIL,
        "password": hashed,
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "seed_script"
    }

    await db.users.insert_one(admin_user)

    print("=" * 50)
    print("  ADMIN USER CREATED SUCCESSFULLY")
    print("=" * 50)
    print(f"  Email:    {ADMIN_EMAIL}")
    print(f"  Password: {ADMIN_PASSWORD}")
    print(f"  Role:     admin")
    print(f"  ID:       {admin_user['id']}")
    print("=" * 50)
    print("  ⚠️  CHANGE THIS PASSWORD AFTER FIRST LOGIN!")
    print("=" * 50)

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
