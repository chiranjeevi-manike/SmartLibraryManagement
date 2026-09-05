from app.database import SessionLocal
from app.models.role import Role
from app.models.user import User
from app.models.author import Author
from app.models.category import Category
from app.models.book import Book
from app.models.book_copy import BookCopy
from app.models.issue import Issue
from app.models.reservation import Reservation
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.models.book_rating import BookRating


def main():
    db = SessionLocal()

    try:
        existing_count = db.query(BookCopy).count()

        if existing_count > 0:
            print(f"Backfill stopped. book_copies already contains {existing_count} records.")
            return

        books = db.query(Book).order_by(Book.id).all()

        accession_counter = 1
        created_copies = 0
        linked_issues = 0

        for book in books:
            active_issues = (
                db.query(Issue)
                .filter(
                    Issue.book_id == book.id,
                    Issue.status == "ISSUED"
                )
                .order_by(Issue.id)
                .all()
            )

            issued_count = len(active_issues)
            expected_issued = book.total_copies - book.available_copies

            if issued_count != expected_issued:
                raise ValueError(
                    f"Inventory mismatch for book {book.id} - {book.title}. "
                    f"Expected issued={expected_issued}, "
                    f"active issues={issued_count}"
                )

            copies_for_book = []

            for _ in range(book.total_copies):
                accession_number = f"ACC-{accession_counter:06d}"

                copy = BookCopy(
                    book_id=book.id,
                    accession_number=accession_number,
                    status="AVAILABLE",
                )

                db.add(copy)
                db.flush()

                copies_for_book.append(copy)

                accession_counter += 1
                created_copies += 1

            for issue, copy in zip(
                active_issues,
                copies_for_book[:issued_count],
            ):
                copy.status = "ISSUED"
                issue.book_copy_id = copy.id
                linked_issues += 1

        db.commit()

        print(f"Created book copies: {created_copies}")
        print(f"Linked active issues: {linked_issues}")
        print("Backfill completed successfully.")

    except Exception as exc:
        db.rollback()
        print("Backfill failed:")
        print(exc)

    finally:
        db.close()


if __name__ == "__main__":
    main()