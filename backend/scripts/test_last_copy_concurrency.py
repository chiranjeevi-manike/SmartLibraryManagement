import threading
import time

from sqlalchemy import text

from app.database import SessionLocal


BOOK_ID = 6

results = []
results_lock = threading.Lock()
start_barrier = threading.Barrier(2)


def worker(worker_name):
    db = SessionLocal()

    try:
        # Make every copy except the first AVAILABLE copy
        # appear unavailable only inside this transaction.
        # We use raw SQL here to avoid ORM relationship
        # initialization issues in standalone scripts.

        start_barrier.wait()

        row = db.execute(
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

        if row is None:
            print(
                f"{worker_name}: no AVAILABLE unlocked copy"
            )

            with results_lock:
                results.append(
                    (worker_name, None)
                )

            db.rollback()
            return

        copy_id = row.id
        accession_number = row.accession_number

        print(
            f"{worker_name}: locked "
            f"{accession_number} (id={copy_id})"
        )

        # Keep the selected row locked so the competing
        # transaction cannot select it.
        time.sleep(3)

        with results_lock:
            results.append(
                (
                    worker_name,
                    accession_number
                )
            )

        db.rollback()

        print(
            f"{worker_name}: rollback complete"
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
    print("\n=== LAST COPY CONCURRENCY TEST ===\n")

    setup_db = SessionLocal()

    try:
        available = setup_db.execute(
            text("""
                SELECT id, accession_number
                FROM book_copies
                WHERE book_id = :book_id
                  AND status = 'AVAILABLE'
                ORDER BY id ASC
            """),
            {"book_id": BOOK_ID}
        ).fetchall()

        if not available:
            print(
                f"Book {BOOK_ID} has no AVAILABLE copies."
            )
            return

        test_copy = available[0]

        print(
            f"Using {test_copy.accession_number} "
            "as the simulated last available copy."
        )

        # Temporarily mark all other AVAILABLE copies
        # as TEST_LOCKED. This transaction remains open,
        # so the changes are never committed.
        #
        # IMPORTANT:
        # Other transactions cannot see these uncommitted
        # changes under PostgreSQL READ COMMITTED, so this
        # alone cannot simulate the last-copy condition.
        #
        # Therefore we commit the temporary state and restore
        # it after the concurrency test.
        other_ids = [
            row.id
            for row in available[1:]
        ]

        if other_ids:
            setup_db.execute(
                text("""
                    UPDATE book_copies
                    SET status = 'TEST_UNAVAILABLE'
                    WHERE id = ANY(:copy_ids)
                """),
                {"copy_ids": other_ids}
            )

            setup_db.commit()

        print(
            f"Temporarily left only "
            f"{test_copy.accession_number} AVAILABLE."
        )

        thread_1 = threading.Thread(
            target=worker,
            args=("Worker-1",)
        )

        thread_2 = threading.Thread(
            target=worker,
            args=("Worker-2",)
        )

        print(
            "\nStarting two concurrent transactions...\n"
        )

        thread_1.start()
        thread_2.start()

        thread_1.join()
        thread_2.join()

        print("\n=== RESULTS ===")

        for worker_name, accession in results:
            print(
                f"{worker_name}: {accession}"
            )

        successful = [
            accession
            for _, accession in results
            if accession is not None
            and not str(accession).startswith("ERROR")
        ]

        no_copy = [
            accession
            for _, accession in results
            if accession is None
        ]

        if (
            len(successful) == 1
            and len(no_copy) == 1
        ):
            print(
                "\nPASS: only one transaction obtained "
                "the last available physical copy."
            )
        else:
            print(
                "\nFAIL: expected exactly one worker "
                "to obtain the last copy."
            )

    finally:
        # Restore any temporary test statuses.
        setup_db.rollback()

        setup_db.execute(
            text("""
                UPDATE book_copies
                SET status = 'AVAILABLE'
                WHERE book_id = :book_id
                  AND status = 'TEST_UNAVAILABLE'
            """),
            {"book_id": BOOK_ID}
        )

        setup_db.commit()
        setup_db.close()

        print(
            "\nTemporary test statuses restored."
        )


if __name__ == "__main__":
    main()