import os
import ssl
import time
from urllib.parse import urlparse
import pg8000.native
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in backend/.env")

parsed = urlparse(DATABASE_URL)

def get_db():
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = True
    ssl_context.verify_mode = ssl.CERT_REQUIRED

    conn = None
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            conn = pg8000.native.Connection(
                user=parsed.username,
                password=parsed.password,
                host=parsed.hostname,
                port=parsed.port or 5432,
                database=parsed.path.lstrip("/"),
                ssl_context=ssl_context
            )
            break  # Connection successful, exit retry loop
        except Exception as e:
            if attempt == max_retries - 1:
                raise e  # Propagate error if all retries fail
            print(f"[WARN] DB Connection failed (Attempt {attempt + 1}/{max_retries}). Retrying in 1.5s...")
            time.sleep(1.5)

    try:
        yield conn
    finally:
        if conn:
            conn.close()