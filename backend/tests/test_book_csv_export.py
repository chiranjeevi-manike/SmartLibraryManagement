import csv
import io


def parse_csv_response(response):
    return list(
        csv.DictReader(
            io.StringIO(response.text)
        )
    )


def test_admin_can_export_books_csv(
    client,
    admin_headers,
    test_book,
):
    response = client.get(
        "/books/export/csv",
        headers=admin_headers,
    )

    assert response.status_code == 200

    assert response.headers[
        "content-type"
    ].startswith("text/csv")

    disposition = response.headers[
        "content-disposition"
    ]

    assert "attachment" in disposition
    assert "library_books_" in disposition

    rows = parse_csv_response(response)

    assert len(rows) > 0

    expected_columns = {
        "id",
        "isbn",
        "title",
        "author_id",
        "author",
        "category_id",
        "category",
        "total_copies",
        "available_copies",
        "issued_copies",
        "is_active",
    }

    assert set(rows[0].keys()) == expected_columns

    exported_book = next(
        row
        for row in rows
        if row["isbn"] == test_book.isbn
    )

    assert (
        exported_book["title"]
        == test_book.title
    )

    assert (
        int(exported_book["total_copies"])
        == test_book.total_copies
    )


def test_librarian_can_export_books_csv(
    client,
    librarian_headers,
    test_book,
):
    response = client.get(
        "/books/export/csv",
        headers=librarian_headers,
    )

    assert response.status_code == 200

    rows = parse_csv_response(response)

    assert any(
        row["isbn"] == test_book.isbn
        for row in rows
    )


def test_member_cannot_export_books_csv(
    client,
    member_headers,
):
    response = client.get(
        "/books/export/csv",
        headers=member_headers,
    )

    assert response.status_code == 403