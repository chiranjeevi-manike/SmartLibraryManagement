from sqlalchemy import text
from app.database import engine

with engine.connect() as connection:
    total = connection.execute(
        text("SELECT SUM(total_copies) FROM books")
    ).scalar()

    unavailable = connection.execute(
        text("SELECT SUM(total_copies - available_copies) FROM books")
    ).scalar()

    active_issues = connection.execute(
        text("SELECT COUNT(*) FROM issues WHERE status = 'ISSUED'")
    ).scalar()

    existing_copies = connection.execute(
        text("SELECT COUNT(*) FROM book_copies")
    ).scalar()

    available_copies = connection.execute(
        text("SELECT COUNT(*) FROM book_copies WHERE status = 'AVAILABLE'")
    ).scalar()

    issued_copies = connection.execute(
        text("SELECT COUNT(*) FROM book_copies WHERE status = 'ISSUED'")
    ).scalar()

    linked_active_issues = connection.execute(
        text("""
            SELECT COUNT(*)
            FROM issues
            WHERE status = 'ISSUED'
              AND book_copy_id IS NOT NULL
        """)
    ).scalar()

print("Total physical copies expected:", total)
print("Unavailable copies expected:", unavailable)
print("Active issues:", active_issues)
print("Existing book_copies:", existing_copies)
print("AVAILABLE:", available_copies)
print("ISSUED:", issued_copies)
print("Linked active issues:", linked_active_issues)



print("\nActive Issue -> Physical Copy Mapping")

with engine.connect() as connection:
    rows = connection.execute(
        text("""
            SELECT
                i.id AS issue_id,
                i.user_id,
                i.book_id,
                bc.id AS copy_id,
                bc.accession_number,
                bc.status
            FROM issues i
            JOIN book_copies bc
                ON bc.id = i.book_copy_id
            WHERE i.status = 'ISSUED'
            ORDER BY i.book_id, i.id
        """)
    ).fetchall()

for row in rows:
    print(
        f"Issue {row.issue_id} | "
        f"User {row.user_id} | "
        f"Book {row.book_id} | "
        f"{row.accession_number} | "
        f"{row.status}"
    )



