import threading
import time

from app.database import SessionLocal
# Import model modules so SQLAlchemy can resolve all relationships
from app.models import (
    author,
    category,
    issue,
    user,
    role,
    reservation,
    notification,
    audit_log,
    book_rating,
    book_copy,
)

from app.models.book import Book
from app.models.book_copy import BookCopy



BOOK_ID = 6

results = []
results_lock = threading.Lock()


def try_lock_copy(worker_name):
    db = SessionLocal()

    try:
        print(f"{worker_name}: starting transaction")

        copy = (
            db.query(BookCopy)
            .filter(
                BookCopy.book_id == BOOK_ID,
                BookCopy.status == "AVAILABLE"
            )
            .order_by(BookCopy.id.asc())
            .with_for_update(skip_locked=True)
            .first()
        )

        if not copy:
            print(f"{worker_name}: no AVAILABLE copy found")

            with results_lock:
                results.append((worker_name, None))

            db.rollback()
            return

        print(
            f"{worker_name}: locked "
            f"{copy.accession_number} (copy id {copy.id})"
        )

        # Keep the row locked long enough for the
        # second thread to attempt its SELECT FOR UPDATE.
        time.sleep(3)

        with results_lock:
            results.append(
                (
                    worker_name,
                    copy.accession_number
                )
            )

        db.rollback()

        print(
            f"{worker_name}: transaction rolled back; "
            f"lock released"
        )

    except Exception as exc:
        db.rollback()

        print(
            f"{worker_name}: ERROR "
            f"{type(exc).__name__}: {exc}"
        )

        with results_lock:
            results.append(
                (
                    worker_name,
                    f"ERROR: {exc}"
                )
            )

    finally:
        db.close()


def main():
    print("\n=== CONCURRENCY LOCK TEST ===\n")

    db = SessionLocal()

    try:
        book = (
            db.query(Book)
            .filter(Book.id == BOOK_ID)
            .first()
        )

        if not book:
            print(f"Book {BOOK_ID} not found.")
            return

        available_copies = (
            db.query(BookCopy)
            .filter(
                BookCopy.book_id == BOOK_ID,
                BookCopy.status == "AVAILABLE"
            )
            .order_by(BookCopy.id.asc())
            .all()
        )

        print(
            f"Book {BOOK_ID}: "
            f"{len(available_copies)} physical copies AVAILABLE"
        )

        for copy in available_copies:
            print(
                f"  {copy.accession_number} "
                f"(id={copy.id})"
            )

    finally:
        db.close()

    print("\nStarting two simultaneous transactions...\n")

    thread_1 = threading.Thread(
        target=try_lock_copy,
        args=("Worker-1",)
    )

    thread_2 = threading.Thread(
        target=try_lock_copy,
        args=("Worker-2",)
    )

    thread_1.start()

    # Give Worker-1 a tiny head start so that it
    # obtains the first available row lock.
    time.sleep(0.2)

    thread_2.start()

    thread_1.join()
    thread_2.join()

    print("\n=== RESULTS ===")

    for worker, accession in results:
        print(f"{worker}: {accession}")

    successful = [
        accession
        for _, accession in results
        if accession
        and not str(accession).startswith("ERROR")
    ]

    if len(successful) >= 2:
        if len(successful) == len(set(successful)):
            print(
                "\nPASS: concurrent transactions "
                "did NOT select the same physical copy."
            )
        else:
            print(
                "\nFAIL: two transactions selected "
                "the same physical copy."
            )

    print(
        "\nNo database changes were committed "
        "during this test."
    )


if __name__ == "__main__":
    main()