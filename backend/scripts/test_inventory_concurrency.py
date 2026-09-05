import threading
import time

from sqlalchemy import text

from app.database import SessionLocal


BOOK_ID = 6

results = []
results_lock = threading.Lock()


def worker(worker_name, delay=0):
    db = SessionLocal()

    try:
        time.sleep(delay)

        print(f"{worker_name}: requesting Book {BOOK_ID} lock")

        # Lock the aggregate Book row.
        book = db.execute(
            text("""
                SELECT id, available_copies
                FROM books
                WHERE id = :book_id
                FOR UPDATE
            """),
            {"book_id": BOOK_ID}
        ).fetchone()

        if not book:
            raise RuntimeError("Book not found")

        before = book.available_copies

        print(
            f"{worker_name}: acquired Book lock; "
            f"available_copies={before}"
        )

        if before <= 0:
            raise RuntimeError("No aggregate copies available")

        # Select and lock one physical copy.
        copy = db.execute(
            text("""
                SELECT id, accession_number
                FROM book_copies
                WHERE book_id = :book_id
                  AND status = 'AVAILABLE'
                ORDER BY id ASC
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            """),
            {"book_id": BOOK_ID}
        ).fetchone()

        if not copy:
            raise RuntimeError(
                "No AVAILABLE physical copy found"
            )

        print(
            f"{worker_name}: selected "
            f"{copy.accession_number}"
        )

        # Simulate the issue operation.
        db.execute(
            text("""
                UPDATE book_copies
                SET status = 'TEST_ISSUED'
                WHERE id = :copy_id
            """),
            {"copy_id": copy.id}
        )

        db.execute(
            text("""
                UPDATE books
                SET available_copies = available_copies - 1
                WHERE id = :book_id
            """),
            {"book_id": BOOK_ID}
        )

        # Keep Worker-1's transaction open briefly.
        # Worker-2 should wait for the Book row lock.
        time.sleep(2)

        db.commit()

        with results_lock:
            results.append(
                (
                    worker_name,
                    before,
                    before - 1,
                    copy.accession_number
                )
            )

        print(
            f"{worker_name}: committed "
            f"{before} -> {before - 1}"
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
                    "ERROR",
                    str(exc),
                    None
                )
            )

    finally:
        db.close()


def main():
    setup_db = SessionLocal()

    original_available = None

    try:
        print(
            "\n=== INVENTORY CONCURRENCY TEST ===\n"
        )

        book = setup_db.execute(
            text("""
                SELECT id, available_copies
                FROM books
                WHERE id = :book_id
            """),
            {"book_id": BOOK_ID}
        ).fetchone()

        if not book:
            print(f"Book {BOOK_ID} not found.")
            return

        original_available = book.available_copies

        physical_available = setup_db.execute(
            text("""
                SELECT COUNT(*)
                FROM book_copies
                WHERE book_id = :book_id
                  AND status = 'AVAILABLE'
            """),
            {"book_id": BOOK_ID}
        ).scalar_one()

        print(
            f"Book {BOOK_ID} starting aggregate "
            f"available_copies: {original_available}"
        )

        print(
            f"Physical AVAILABLE copies: "
            f"{physical_available}"
        )

        if original_available < 2:
            print(
                "\nNeed at least 2 available copies "
                "for this test."
            )
            return

        if physical_available < 2:
            print(
                "\nNeed at least 2 physical AVAILABLE "
                "copies for this test."
            )
            return

    finally:
        setup_db.close()

    thread_1 = threading.Thread(
        target=worker,
        args=("Worker-1", 0)
    )

    thread_2 = threading.Thread(
        target=worker,
        args=("Worker-2", 0.2)
    )

    try:
        print(
            "\nStarting concurrent inventory updates...\n"
        )

        thread_1.start()
        thread_2.start()

        thread_1.join()
        thread_2.join()

        verify_db = SessionLocal()

        try:
            final_available = verify_db.execute(
                text("""
                    SELECT available_copies
                    FROM books
                    WHERE id = :book_id
                """),
                {"book_id": BOOK_ID}
            ).scalar_one()

            test_issued = verify_db.execute(
                text("""
                    SELECT COUNT(*)
                    FROM book_copies
                    WHERE book_id = :book_id
                      AND status = 'TEST_ISSUED'
                """),
                {"book_id": BOOK_ID}
            ).scalar_one()

            expected = original_available - 2

            print("\n=== RESULTS ===")

            for result in results:
                print(result)

            print(
                f"\nStarting available_copies: "
                f"{original_available}"
            )

            print(
                f"Expected after two issues: "
                f"{expected}"
            )

            print(
                f"Actual after two issues: "
                f"{final_available}"
            )

            print(
                f"TEST_ISSUED physical copies: "
                f"{test_issued}"
            )

            if (
                final_available == expected
                and test_issued == 2
            ):
                print(
                    "\nPASS: Book row locking prevented "
                    "a lost inventory update."
                )
            else:
                print(
                    "\nFAIL: inventory counters are "
                    "not consistent."
                )

        finally:
            verify_db.close()

    finally:
        # Always restore the test changes.
        cleanup_db = SessionLocal()

        try:
            cleanup_db.execute(
                text("""
                    UPDATE book_copies
                    SET status = 'AVAILABLE'
                    WHERE book_id = :book_id
                      AND status = 'TEST_ISSUED'
                """),
                {"book_id": BOOK_ID}
            )

            if original_available is not None:
                cleanup_db.execute(
                    text("""
                        UPDATE books
                        SET available_copies = :original
                        WHERE id = :book_id
                    """),
                    {
                        "original": original_available,
                        "book_id": BOOK_ID
                    }
                )

            cleanup_db.commit()

            print(
                "\nTest inventory restored "
                "to its original state."
            )

        except Exception:
            cleanup_db.rollback()
            raise

        finally:
            cleanup_db.close()


if __name__ == "__main__":
    main()