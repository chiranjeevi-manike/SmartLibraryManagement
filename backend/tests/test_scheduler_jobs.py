from unittest.mock import MagicMock

from app import main




def test_reservation_job_closes_database(
    monkeypatch,
):
    db = MagicMock()
    process_job = MagicMock(
        return_value={
            "expired_count": 0,
        }
    )

    monkeypatch.setattr(
        main,
        "SessionLocal",
        lambda: db,
    )

    monkeypatch.setattr(
        main,
        "process_expired_ready_reservations",
        process_job,
    )

    main.run_reservation_expiry_job()

    process_job.assert_called_once_with(db)
    db.close.assert_called_once()


def test_reservation_job_rolls_back_on_failure(
    monkeypatch,
):
    db = MagicMock()

    monkeypatch.setattr(
        main,
        "SessionLocal",
        lambda: db,
    )

    monkeypatch.setattr(
        main,
        "process_expired_ready_reservations",
        MagicMock(
            side_effect=RuntimeError(
                "Reservation test failure"
            )
        ),
    )

    main.run_reservation_expiry_job()

    db.rollback.assert_called_once()
    db.close.assert_called_once()


def test_notification_job_commits_and_closes(
    monkeypatch,
):
    db = MagicMock()

    monkeypatch.setattr(
        main,
        "SessionLocal",
        lambda: db,
    )

    monkeypatch.setattr(
        main,
        "generate_due_reminders",
        MagicMock(
            return_value={
                "created_count": 1,
            }
        ),
    )

    monkeypatch.setattr(
        main,
        "generate_overdue_notifications",
        MagicMock(
            return_value={
                "created_count": 2,
            }
        ),
    )

    email_result = {
        "sent_count": 1,
        "failed_count": 0,
    }

    monkeypatch.setattr(
        main,
        "send_due_reminder_emails",
        MagicMock(
            return_value=email_result
        ),
    )

    monkeypatch.setattr(
        main,
        "send_overdue_emails",
        MagicMock(
            return_value=email_result
        ),
    )

    monkeypatch.setattr(
        main,
        "send_reservation_ready_emails",
        MagicMock(
            return_value=email_result
        ),
    )

    main.run_notification_job()

    db.commit.assert_called_once()
    db.rollback.assert_not_called()
    db.close.assert_called_once()


def test_notification_job_rolls_back_on_failure(
    monkeypatch,
):
    db = MagicMock()

    monkeypatch.setattr(
        main,
        "SessionLocal",
        lambda: db,
    )

    monkeypatch.setattr(
        main,
        "generate_due_reminders",
        MagicMock(
            side_effect=RuntimeError(
                "Notification test failure"
            )
        ),
    )

    main.run_notification_job()

    db.commit.assert_not_called()
    db.rollback.assert_called_once()
    db.close.assert_called_once()