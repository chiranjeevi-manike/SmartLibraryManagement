from app.models.book import Book
from app.models.book_copy import BookCopy


def make_csv_file(content: str):
    return {
        "file": (
            "books.csv",
            content.encode("utf-8"),
            "text/csv",
        )
    }


def test_admin_can_import_books_from_csv(
    client,
    db,
    admin_headers,
    test_book,
):
    csv_content = (
        "isbn,title,author_id,category_id,total_copies\n"
        f"CSV-BOOK-001,CSV Imported Book,"
        f"{test_book.author_id},"
        f"{test_book.category_id},3\n"
    )

    response = client.post(
        "/books/import/csv",
        files=make_csv_file(csv_content),
        headers=admin_headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["imported_count"] == 1
    assert data["failed_count"] == 0
    assert data["errors"] == []

    imported_book = (
        db.query(Book)
        .filter(Book.isbn == "CSV-BOOK-001")
        .first()
    )

    assert imported_book is not None
    assert imported_book.title == "CSV Imported Book"
    assert imported_book.total_copies == 3
    assert imported_book.available_copies == 3

    copies = (
        db.query(BookCopy)
        .filter(
            BookCopy.book_id == imported_book.id
        )
        .all()
    )

    assert len(copies) == 3

    assert all(
        copy.status == "AVAILABLE"
        for copy in copies
    )


def test_import_reports_invalid_rows(
    client,
    admin_headers,
    test_book,
):
    csv_content = (
        "isbn,title,author_id,category_id,total_copies\n"
        f",Missing ISBN,"
        f"{test_book.author_id},"
        f"{test_book.category_id},2\n"
        f"CSV-BAD-002,Bad Copies,"
        f"{test_book.author_id},"
        f"{test_book.category_id},0\n"
        "CSV-BAD-003,Unknown Author,"
        "999999,"
        f"{test_book.category_id},2\n"
    )

    response = client.post(
        "/books/import/csv",
        files=make_csv_file(csv_content),
        headers=admin_headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["imported_count"] == 0
    assert data["failed_count"] == 3
    assert len(data["errors"]) == 3


def test_member_cannot_import_books(
    client,
    member_headers,
    test_book,
):
    csv_content = (
        "isbn,title,author_id,category_id,total_copies\n"
        f"CSV-MEMBER-001,Forbidden Book,"
        f"{test_book.author_id},"
        f"{test_book.category_id},1\n"
    )

    response = client.post(
        "/books/import/csv",
        files=make_csv_file(csv_content),
        headers=member_headers,
    )

    assert response.status_code == 403


def test_book_import_rejects_non_csv_file(
    client,
    admin_headers,
):
    response = client.post(
        "/books/import/csv",
        files={
            "file": (
                "books.txt",
                b"not a csv file",
                "text/plain",
            )
        },
        headers=admin_headers,
    )

    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "Only CSV files are allowed"
    )


def test_book_import_rejects_missing_columns(
    client,
    admin_headers,
):
    csv_content = (
        "isbn,title,total_copies\n"
        "CSV-MISSING-001,Missing Columns,2\n"
    )

    response = client.post(
        "/books/import/csv",
        files=make_csv_file(csv_content),
        headers=admin_headers,
    )

    assert response.status_code == 400

    detail = response.json()["detail"]

    assert "author_id" in detail
    assert "category_id" in detail