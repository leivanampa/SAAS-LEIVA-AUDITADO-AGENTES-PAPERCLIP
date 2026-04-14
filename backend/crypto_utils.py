"""
Encryption utilities for sensitive data stored in MongoDB.
Uses Fernet symmetric encryption (AES-128-CBC with HMAC).

The encryption key is derived from a dedicated env var ENCRYPTION_KEY.
Generate one with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""
import os
import logging
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

_ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY", "")
_fernet = None

if _ENCRYPTION_KEY:
    try:
        _fernet = Fernet(_ENCRYPTION_KEY.encode())
    except Exception as e:
        logger.error(f"Invalid ENCRYPTION_KEY: {e}")


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string value. Returns the original if encryption is not configured."""
    if not _fernet or not plaintext:
        return plaintext
    try:
        return _fernet.encrypt(plaintext.encode()).decode()
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        return plaintext


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a string value. Returns the original if decryption fails or is not configured."""
    if not _fernet or not ciphertext:
        return ciphertext
    try:
        return _fernet.decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        # Value might not be encrypted (legacy data) — return as-is
        return ciphertext
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        return ciphertext


# Fields that should be encrypted before storing in MongoDB
SENSITIVE_FIELDS = {"client_secret", "api_key", "password", "token", "secret"}


def encrypt_dict(data: dict) -> dict:
    """Encrypt sensitive fields in a dictionary before storing."""
    result = dict(data)
    for key, value in result.items():
        if isinstance(value, str) and any(sf in key.lower() for sf in SENSITIVE_FIELDS):
            result[key] = encrypt_value(value)
        elif isinstance(value, dict):
            result[key] = encrypt_dict(value)
    return result


def decrypt_dict(data: dict) -> dict:
    """Decrypt sensitive fields in a dictionary after reading."""
    result = dict(data)
    for key, value in result.items():
        if isinstance(value, str) and any(sf in key.lower() for sf in SENSITIVE_FIELDS):
            result[key] = decrypt_value(value)
        elif isinstance(value, dict):
            result[key] = decrypt_dict(value)
    return result
