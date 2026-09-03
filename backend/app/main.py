from app.models.author import Author
from app.models.category import Category
from app.routers.categories import router as categories_router
#from app.routers.categories import router as categories_router
from app.routers.books import router as books_router
from app.routers.issues import router as issues_router
from app.models.book import Book
from app.models.issue import Issue
from fastapi import FastAPI

from app.routers import reports

from apscheduler.schedulers.background import BackgroundScheduler




from app.database import SessionLocal
from app.services.reservation_service import (
    process_expired_ready_reservations
)

from app.services.notification_service import (
    generate_due_reminders,
    generate_overdue_notifications
)

from app.database import Base, engine
from app.config import DATABASE_NAME

# Import models before create_all()
from app.models.role import Role
from app.models.user import User

# Import routers
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.authors import router as authors_router

from app.models.reservation import Reservation


from app.routers.reservations import router as reservations_router

from app.routers.dashboard import router as dashboard_router

from app.models.notification import Notification

from app.routers.notifications import router as notifications_router

from app.models.audit_log import AuditLog

from app.routers import audit_logs
from app.models.book_rating import BookRating
from app.routers import ratings
from app.routers import analytics

from fastapi.middleware.cors import CORSMiddleware
# --------------------------------------------------
# Create database tables
# --------------------------------------------------

print("Tables:", Base.metadata.tables.keys())
Base.metadata.create_all(bind=engine)


# --------------------------------------------------
# Create FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="Smart Library Management System",
    version="1.0.0",
    description="Backend API for Smart Library Management System"
)



from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def start_scheduler():
    if not scheduler.running:
        scheduler.start()


@app.on_event("shutdown")
def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
# --------------------------------------------------
# Basic routes
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to Smart Library Management System!",
        "database": DATABASE_NAME
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "database": DATABASE_NAME,
        "version": "1.0.0"
    }

def run_reservation_expiry_job():
    db = SessionLocal()

    try:
        result = process_expired_ready_reservations(db)

        print(
            "Reservation expiry job:",
            result
        )

    except Exception as error:
        print(
            "Reservation expiry job failed:",
            error
        )

    finally:
        db.close()


scheduler = BackgroundScheduler()

scheduler.add_job(
    run_reservation_expiry_job,
    trigger="interval",
    minutes=5,
    id="reservation_expiry_job",
    replace_existing=True
)


def run_notification_job():
    db = SessionLocal()

    try:
        due_result = generate_due_reminders(db)

        overdue_result = generate_overdue_notifications(db)

        print(
            "Notification job:",
            {
                "due_reminders": due_result["created_count"],
                "overdue_notifications": overdue_result["created_count"]
            }
        )

    except Exception as error:
        print(
            "Notification job failed:",
            error
        )

    finally:
        db.close()


scheduler.add_job(
    run_notification_job,
    trigger="interval",
    minutes=5,
    id="notification_job",
    replace_existing=True
)
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