def test_physical_book_copies_are_created(
    test_book,
    test_book_copies,
):
    assert len(test_book_copies) == 3

    assert test_book_copies[0].book_id == test_book.id
    assert test_book_copies[0].accession_number == "TEST-ACC-001"
    assert test_book_copies[0].status == "AVAILABLE"

    assert test_book_copies[1].accession_number == "TEST-ACC-002"
    assert test_book_copies[1].status == "AVAILABLE"

    assert test_book_copies[2].accession_number == "TEST-ACC-003"
    assert test_book_copies[2].status == "AVAILABLE"



def test_book_copy_qr_endpoint_returns_png(
    client,
    member_headers,
    test_book_copies,
):
    copy_id = test_book_copies[0].id

    response = client.get(
        f"/book-copies/{copy_id}/qr",
        headers=member_headers,
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert len(response.content) > 0



def test_book_copy_qr_not_found(
    client,
    member_headers,
):
    response = client.get(
        "/book-copies/999999/qr",
        headers=member_headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Book copy not found"