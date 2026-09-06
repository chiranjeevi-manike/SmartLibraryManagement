import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

# Import all models so SQLAlchemy knows all tables
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
from app.models import book

from app.models.role import Role
from app.models.user import User
from app.utils.security import hash_password

from app.models.book import Book
from app.models.author import Author
from app.models.category import Category

from app.models.book_copy import BookCopy
# ---------------------------------------------------------
# TEST DATABASE CONFIGURATION
# ---------------------------------------------------------

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")

assert TEST_DATABASE_URL, "TEST_DATABASE_URL is not set"


test_engine = create_engine(TEST_DATABASE_URL)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)


# ---------------------------------------------------------
# CREATE AND SEED TEST DATABASE
# ---------------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():

    # Start with a clean test database
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    session = TestingSessionLocal()

    try:
        # -------------------------------------------------
        # Create roles
        # -------------------------------------------------

        admin_role = Role(name="ADMIN")
        librarian_role = Role(name="LIBRARIAN")
        member_role = Role(name="MEMBER")

        session.add_all([
            admin_role,
            librarian_role,
            member_role,
        ])

        # Generate role IDs before creating users
        session.flush()

        # -------------------------------------------------
        # Get test passwords from environment variables
        # -------------------------------------------------

        admin_password = os.getenv("TEST_ADMIN_PASSWORD")
        librarian_password = os.getenv("TEST_LIBRARIAN_PASSWORD")
        member_password = os.getenv("TEST_MEMBER_PASSWORD")

        assert admin_password, "TEST_ADMIN_PASSWORD is not set"
        assert librarian_password, "TEST_LIBRARIAN_PASSWORD is not set"
        assert member_password, "TEST_MEMBER_PASSWORD is not set"

        # -------------------------------------------------
        # Create test users
        # -------------------------------------------------

        admin_user = User(
            username="admin",
            email="admin@test.local",
            password=hash_password(admin_password),
            full_name="Test Admin",
            role_id=admin_role.id,
        )

        librarian_user = User(
            username="librarian1",
            email="librarian@test.local",
            password=hash_password(librarian_password),
            full_name="Test Librarian",
            role_id=librarian_role.id,
        )

        member_user = User(
            username="member1",
            email="member@test.local",
            password=hash_password(member_password),
            full_name="Test Member",
            role_id=member_role.id,
        )

        session.add_all([
            admin_user,
            librarian_user,
            member_user,
        ])

        session.commit()

    finally:
        session.close()

    # Tests execute here
    yield

    # Remove test tables after the complete pytest session
    Base.metadata.drop_all(bind=test_engine)


# ---------------------------------------------------------
# DATABASE SESSION FOR EACH TEST
# ---------------------------------------------------------

@pytest.fixture
def db():
    connection = test_engine.connect()
    transaction = connection.begin()

    session = TestingSessionLocal(
        bind=connection,
        join_transaction_mode="create_savepoint",
    )

    try:
        yield session
    finally:
        session.close()

        if transaction.is_active:
            transaction.rollback()

        connection.close()



@pytest.fixture
def test_book(db):
    # Create required author
    test_author = Author(
        name="Pytest Test Author"
    )

    db.add(test_author)
    db.flush()

    # Create required category
    test_category = Category(
        name="Pytest Test Category"
    )

    db.add(test_category)
    db.flush()

    # Create test book
    book = Book(
        title="Pytest Test Book",
        isbn="TEST-ISBN-001",
        author_id=test_author.id,
        category_id=test_category.id,
        total_copies=3,
        available_copies=3,
    )

    db.add(book)
    db.flush()

    return book




@pytest.fixture
def test_book_copies(db, test_book):
    copies = [
        BookCopy(
            book_id=test_book.id,
            accession_number="TEST-ACC-001",
            status="AVAILABLE",
            shelf_location="TEST-A1",
        ),
        BookCopy(
            book_id=test_book.id,
            accession_number="TEST-ACC-002",
            status="AVAILABLE",
            shelf_location="TEST-A1",
        ),
        BookCopy(
            book_id=test_book.id,
            accession_number="TEST-ACC-003",
            status="AVAILABLE",
            shelf_location="TEST-A1",
        ),
    ]

    db.add_all(copies)
    db.flush()

    return copies



@pytest.fixture
def four_test_books(db):
    test_author = Author(name="Max Limit Test Author")
    db.add(test_author)
    db.flush()

    test_category = Category(name="Max Limit Test Category")
    db.add(test_category)
    db.flush()

    books = []

    for i in range(1, 5):
        book = Book(
            title=f"Max Limit Test Book {i}",
            isbn=f"MAX-TEST-ISBN-{i}",
            author_id=test_author.id,
            category_id=test_category.id,
            total_copies=1,
            available_copies=1,
        )

        db.add(book)
        db.flush()

        copy = BookCopy(
            book_id=book.id,
            accession_number=f"MAX-TEST-ACC-{i}",
            status="AVAILABLE",
            shelf_location="TEST-B1",
        )

        db.add(copy)
        books.append(book)

    db.flush()

    return books


@pytest.fixture
def test_member(db):
    member = (
        db.query(User)
        .filter(User.username == "member1")
        .first()
    )

    assert member is not None
    return member

# ---------------------------------------------------------
# FASTAPI TEST CLIENT
# ---------------------------------------------------------

@pytest.fixture
def client(db):

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# ---------------------------------------------------------
# ADMIN AUTHENTICATION
# ---------------------------------------------------------

@pytest.fixture
def admin_token(client):
    password = os.getenv("TEST_ADMIN_PASSWORD")

    assert password, "TEST_ADMIN_PASSWORD is not set"

    response = client.post(
        "/auth/login",
        data={
            "username": "admin",
            "password": password,
        },
    )

    assert response.status_code == 200

    return response.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    return {
        "Authorization": f"Bearer {admin_token}"
    }


# ---------------------------------------------------------
# LIBRARIAN AUTHENTICATION
# ---------------------------------------------------------

@pytest.fixture
def librarian_token(client):
    password = os.getenv("TEST_LIBRARIAN_PASSWORD")

    assert password, "TEST_LIBRARIAN_PASSWORD is not set"

    response = client.post(
        "/auth/login",
        data={
            "username": "librarian1",
            "password": password,
        },
    )

    assert response.status_code == 200

    return response.json()["access_token"]


@pytest.fixture
def librarian_headers(librarian_token):
    return {
        "Authorization": f"Bearer {librarian_token}"
    }


# ---------------------------------------------------------
# MEMBER AUTHENTICATION
# ---------------------------------------------------------

@pytest.fixture
def member_token(client):
    password = os.getenv("TEST_MEMBER_PASSWORD")

    assert password, "TEST_MEMBER_PASSWORD is not set"

    response = client.post(
        "/auth/login",
        data={
            "username": "member1",
            "password": password,
        },
    )

    assert response.status_code == 200

    return response.json()["access_token"]


@pytest.fixture
def member_headers(member_token):
    return {
        "Authorization": f"Bearer {member_token}"
    }