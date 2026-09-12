from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import DATABASE_NAME
from app.database import Base, SessionLocal, engine

# Import models before create_all().
from app.models.audit_log import AuditLog
from app.models.author import Author
from app.models.book import Book
from app.models.book_rating import BookRating
from app.models.category import Category
from app.models.issue import Issue
from app.models.notification import Notification
from app.models.reservation import Reservation
from app.models.role import Role
from app.models.user import User

# Import routers.
from app.routers import (
    analytics,
    audit_logs,
    book_copies,
    notification_deliveries,
    ratings,
    reports,
)
from app.routers.auth import router as auth_router
from app.routers.authors import router as authors_router
from app.routers.books import router as books_router
from app.routers.categories import router as categories_router
from app.routers.dashboard import router as dashboard_router
from app.routers.issues import router as issues_router
from app.routers.notifications import router as notifications_router
from app.routers.reservations import router as reservations_router
from app.routers.users import router as users_router

from app.services.notification_service import (
    generate_due_reminders,
    generate_overdue_notifications,
    send_due_reminder_emails,
    send_overdue_emails,
    send_reservation_ready_emails,
)
from app.services.reservation_service import (
    process_expired_ready_reservations,
)


# --------------------------------------------------
# Create database tables
# --------------------------------------------------

# Keep create_all() until the empty baseline migration is
# replaced by a complete, tested initial-schema migration.
print("Tables:", Base.metadata.tables.keys())
Base.metadata.create_all(bind=engine)


# --------------------------------------------------
# Scheduled jobs
# --------------------------------------------------

def run_reservation_expiry_job():
    db = SessionLocal()

    try:
        result = process_expired_ready_reservations(db)
        print("Reservation expiry job:", result)
    except Exception as error:
        print("Reservation expiry job failed:", error)
    finally:
        db.close()


def run_notification_job():
    db = SessionLocal()

    try:
        due_result = generate_due_reminders(db)
        overdue_result = generate_overdue_notifications(db)
        email_result = send_due_reminder_emails(db)
        overdue_email_result = send_overdue_emails(db)
        reservation_email_result = send_reservation_ready_emails(db)

        db.commit()

        print(
            "Notification job:",
            {
                "due_reminders": due_result["created_count"],
                "overdue_notifications": (
                    overdue_result["created_count"]
                ),
                "due_emails_sent": email_result["sent_count"],
                "due_emails_failed": email_result["failed_count"],
                "overdue_emails_sent": (
                    overdue_email_result["sent_count"]
                ),
                "overdue_emails_failed": (
                    overdue_email_result["failed_count"]
                ),
                "reservation_ready_emails_sent": (
                    reservation_email_result["sent_count"]
                ),
                "reservation_ready_emails_failed": (
                    reservation_email_result["failed_count"]
                ),
            },
        )
    except Exception as error:
        db.rollback()
        print("Notification job failed:", error)
    finally:
        db.close()


scheduler = BackgroundScheduler()

scheduler.add_job(
    run_reservation_expiry_job,
    trigger="interval",
    minutes=5,
    id="reservation_expiry_job",
    replace_existing=True,
)

scheduler.add_job(
    run_notification_job,
    trigger="interval",
    minutes=5,
    id="notification_job",
    replace_existing=True,
)


# --------------------------------------------------
# Application lifespan
# --------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not scheduler.running:
        scheduler.start()

    try:
        yield
    finally:
        if scheduler.running:
            scheduler.shutdown()


# --------------------------------------------------
# Create FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="Smart Library Management System",
    version="1.0.0",
    description=(
        "Backend API for Smart Library Management System"
    ),
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://localhost:4174",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:4174",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        (
            "https://reasonable-growth-production-a6c1."
            "up.railway.app"
        ),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Basic routes
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": (
            "Welcome to Smart Library Management System!"
        ),
        "database": DATABASE_NAME,
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "database": DATABASE_NAME,
        "version": "1.0.0",
    }


# --------------------------------------------------
# Register routers
# --------------------------------------------------

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(authors_router)
app.include_router(categories_router)
app.include_router(books_router)
app.include_router(issues_router)
app.include_router(reservations_router)
app.include_router(dashboard_router)
app.include_router(notifications_router)
app.include_router(reports.router)
app.include_router(audit_logs.router)
app.include_router(ratings.router)
app.include_router(analytics.router)
app.include_router(book_copies.router)
app.include_router(notification_deliveries.router)
