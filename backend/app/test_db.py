from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    db_name = conn.execute(text("SELECT current_database();")).scalar()
    print("Connected Database:", db_name)

    tables = conn.execute(text("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema='public'
    """))

    print("\nTables:")
    for table in tables:
        print(table[0])