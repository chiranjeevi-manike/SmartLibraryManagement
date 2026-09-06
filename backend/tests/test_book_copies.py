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