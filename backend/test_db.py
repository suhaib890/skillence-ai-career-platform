import os
import sys

import psycopg2

DB_URL = os.getenv("DATABASE_URL", "").replace("postgresql+psycopg2://", "postgresql://", 1)

if not DB_URL:
    print("ERROR: DATABASE_URL is not set.")
    sys.exit(1)

try:
    print("Connecting to database...")
    conn = psycopg2.connect(DB_URL, connect_timeout=15)
    cur = conn.cursor()
    print("Connected OK!")

    cur.execute("SELECT COUNT(*) FROM users;")
    print("Users count:", cur.fetchone()[0])

    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;")
    tables = [r[0] for r in cur.fetchall()]
    print("Tables:", tables)

    conn.close()
    print("Done.")
except Exception as e:
    print("ERROR:", type(e).__name__, str(e))
