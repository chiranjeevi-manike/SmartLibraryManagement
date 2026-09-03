import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Books() {
  // ==================================================
  // STATE
  // ==================================================

  const [books, setBooks] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);

  const [formData, setFormData] = useState({
    isbn: "",
    title: "",
    author_id: "",
    category_id: "",
    total_copies: 1,
  });

  const navigate = useNavigate();

  // ==================================================
  // CURRENT USER / ROLE
  // ==================================================

  let storedUser = {};

  try {
    storedUser = JSON.parse(
      localStorage.getItem("user") || "{}"
    );
  } catch {
    storedUser = {};
  }

  const roleId = Number(storedUser.role_id);

  const isAdmin = roleId === 2;
  const isLibrarian = roleId === 3;
  const isMember = roleId === 4;

  const canManageBooks =
    isAdmin || isLibrarian;

  // ==================================================
  // TOKEN
  // ==================================================

  const getToken = () => {
    return localStorage.getItem("token");
  };

  const getHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
  });

  // ==================================================
  // AUTH ERROR
  // ==================================================

 const handleAuthError = (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role_id");

    navigate("/");

    return true;
  }

  return false;
};

  // ==================================================
  // RESET FORM
  // ==================================================

  const resetForm = () => {
    setFormData({
      isbn: "",
      title: "",
      author_id: "",
      category_id: "",
      total_copies: 1,
    });

    setEditingBook(null);
  };

  // ==================================================
  // FETCH BOOKS
  // ==================================================

  const fetchBooks = async () => {
    try {
      if (!getToken()) {
        navigate("/");
        return;
      }

      const response = await axios.get(
        "http://127.0.0.1:8000/books/",
        {
          headers: getHeaders(),
        }
      );

      let data = [];

      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (
        Array.isArray(response.data.books)
      ) {
        data = response.data.books;
      } else if (
        Array.isArray(response.data.items)
      ) {
        data = response.data.items;
      } else if (
        Array.isArray(response.data.results)
      ) {
        data = response.data.results;
      }

      setBooks(data);
    } catch (error) {
      console.error("Books API Error:", error);

      if (handleAuthError(error)) {
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Unable to load books."
      );
    }
  };

  // ==================================================
  // FETCH AUTHORS
  // ==================================================

  const fetchAuthors = async () => {
    try {
      if (!getToken()) {
        return;
      }

      const response = await axios.get(
        "http://127.0.0.1:8000/authors/",
        {
          headers: getHeaders(),
        }
      );

      let data = [];

      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (
        Array.isArray(response.data.authors)
      ) {
        data = response.data.authors;
      } else if (
        Array.isArray(response.data.items)
      ) {
        data = response.data.items;
      }

      setAuthors(data);
    } catch (error) {
      console.error(
        "Unable to load authors:",
        error
      );
    }
  };

  // ==================================================
  // FETCH CATEGORIES
  // ==================================================

  const fetchCategories = async () => {
    try {
      if (!getToken()) {
        return;
      }

      const response = await axios.get(
        "http://127.0.0.1:8000/categories/",
        {
          headers: getHeaders(),
        }
      );

      let data = [];

      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (
        Array.isArray(response.data.categories)
      ) {
        data = response.data.categories;
      } else if (
        Array.isArray(response.data.items)
      ) {
        data = response.data.items;
      }

      setCategories(data);
    } catch (error) {
      console.error(
        "Unable to load categories:",
        error
      );
    }
  };

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      await Promise.all([
        fetchBooks(),
        fetchAuthors(),
        fetchCategories(),
      ]);

      setLoading(false);
    };

    loadData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================================================
  // FORM CHANGE
  // ==================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // ==================================================
  // ADD BUTTON
  // ==================================================

  const handleAddButton = () => {
    if (!canManageBooks) {
      return;
    }

    if (showForm) {
      setShowForm(false);
      resetForm();
    } else {
      resetForm();
      setShowForm(true);
    }
  };

  // ==================================================
  // ADD BOOK
  // ==================================================

  const handleAddBook = async (e) => {
    e.preventDefault();

    if (!canManageBooks) {
      alert(
        "You do not have permission to add books."
      );
      return;
    }

    try {
      const payload = {
        isbn: formData.isbn.trim(),
        title: formData.title.trim(),
        author_id: Number(
          formData.author_id
        ),
        category_id: Number(
          formData.category_id
        ),
        total_copies: Number(
          formData.total_copies
        ),
      };

      await axios.post(
        "http://127.0.0.1:8000/books/",
        payload,
        {
          headers: getHeaders(),
        }
      );

      alert("Book added successfully.");

      resetForm();
      setShowForm(false);

      await fetchBooks();
    } catch (error) {
      console.error(
        "Add Book Error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      alert(
        error.response?.data?.detail ||
          "Unable to add book."
      );
    }
  };

  // ==================================================
  // EDIT BOOK
  // ==================================================

  const handleEditBook = (book) => {
    if (!canManageBooks) {
      return;
    }

    setEditingBook(book);

    setFormData({
      isbn: book.isbn || "",
      title: book.title || "",
      author_id: book.author_id || "",
      category_id: book.category_id || "",
      total_copies:
        book.total_copies || 1,
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ==================================================
  // UPDATE BOOK
  // ==================================================

  const handleUpdateBook = async (e) => {
    e.preventDefault();

    if (!editingBook) {
      return;
    }

    try {
      const payload = {
        isbn: formData.isbn.trim(),
        title: formData.title.trim(),
        author_id: Number(
          formData.author_id
        ),
        category_id: Number(
          formData.category_id
        ),
        total_copies: Number(
          formData.total_copies
        ),
      };

      await axios.put(
        `http://127.0.0.1:8000/books/${editingBook.id}`,
        payload,
        {
          headers: getHeaders(),
        }
      );

      alert("Book updated successfully.");

      resetForm();
      setShowForm(false);

      await fetchBooks();
    } catch (error) {
      console.error(
        "Update Book Error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      alert(
        error.response?.data?.detail ||
          "Unable to update book."
      );
    }
  };

  // ==================================================
  // DEACTIVATE BOOK
  // ==================================================

  const handleDeactivateBook = async (
    book
  ) => {
    if (!isAdmin) {
      alert(
        "Only administrators can deactivate books."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${book.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(
        `http://127.0.0.1:8000/books/${book.id}`,
        {
          headers: getHeaders(),
        }
      );

      alert(
        "Book deactivated successfully."
      );

      await fetchBooks();
    } catch (error) {
      console.error(
        "Deactivate Book Error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      alert(
        error.response?.data?.detail ||
          "Unable to deactivate book."
      );
    }
  };

  // ==================================================
  // FILTER
  // ==================================================

  const filteredBooks = books.filter(
    (book) => {
      const searchText = search
        .trim()
        .toLowerCase();

      return (
        book.title
          ?.toLowerCase()
          .includes(searchText) ||
        book.isbn
          ?.toLowerCase()
          .includes(searchText)
      );
    }
  );

  // ==================================================
  // SUMMARY
  // ==================================================

  const totalCopies = books.reduce(
    (sum, book) =>
      sum + Number(book.total_copies || 0),
    0
  );

  const availableCopies = books.reduce(
    (sum, book) =>
      sum +
      Number(book.available_copies || 0),
    0
  );

  const unavailableTitles = books.filter(
    (book) =>
      Number(book.available_copies) === 0
  ).length;

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <div style={loadingStyle}>
        Loading books...
      </div>
    );
  }

  // ==================================================
  // PAGE
  // ==================================================

  return (
    <div style={pageStyle}>
      {/* HEADER */}

      <div style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>
            {isMember
              ? "Browse Books"
              : "Books"}
          </h1>

          <p style={pageSubtitleStyle}>
            {isMember
              ? "Browse library books and check availability."
              : "Manage books, copies and availability."}
          </p>
        </div>

        {canManageBooks && (
          <button
            onClick={handleAddButton}
            style={
              showForm
                ? cancelTopButtonStyle
                : addButtonStyle
            }
          >
            {showForm
              ? "Cancel"
              : "+ Add Book"}
          </button>
        )}
      </div>

      {/* SUMMARY CARDS */}

      <div style={summaryGridStyle}>
        <SummaryCard
          title="Book Titles"
          value={books.length}
          icon="📚"
          background="#dbeafe"
        />

        <SummaryCard
          title="Total Copies"
          value={totalCopies}
          icon="▤"
          background="#ede9fe"
        />

        <SummaryCard
          title="Available Copies"
          value={availableCopies}
          icon="✓"
          background="#dcfce7"
        />

        <SummaryCard
          title="Unavailable Titles"
          value={unavailableTitles}
          icon="!"
          background="#fee2e2"
        />
      </div>

      {/* ADD / EDIT FORM */}

      {canManageBooks && showForm && (
        <form
          onSubmit={
            editingBook
              ? handleUpdateBook
              : handleAddBook
          }
          style={formStyle}
        >
          <div style={formHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>
                {editingBook
                  ? "Edit Book"
                  : "Add New Book"}
              </h2>

              <p style={sectionSubtitleStyle}>
                {editingBook
                  ? "Update the selected book details."
                  : "Add a new title to the library catalog."}
              </p>
            </div>
          </div>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>
                Book Title
              </label>

              <input
                type="text"
                name="title"
                placeholder="Enter book title"
                value={formData.title}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                ISBN
              </label>

              <input
                type="text"
                name="isbn"
                placeholder="Enter ISBN"
                value={formData.isbn}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Author
              </label>

              <select
                name="author_id"
                value={formData.author_id}
                onChange={handleChange}
                required
                style={inputStyle}
              >
                <option value="">
                  Select Author
                </option>

                {authors.map((author) => (
                  <option
                    key={author.id}
                    value={author.id}
                  >
                    {author.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Category
              </label>

              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                required
                style={inputStyle}
              >
                <option value="">
                  Select Category
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Total Copies
              </label>

              <input
                type="number"
                name="total_copies"
                value={formData.total_copies}
                onChange={handleChange}
                required
                min="1"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={formActionsStyle}>
            <button
              type="submit"
              style={saveButtonStyle}
            >
              {editingBook
                ? "Update Book"
                : "Save Book"}
            </button>

            {editingBook && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                style={secondaryButtonStyle}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      )}

      {/* ERROR */}

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {/* CATALOG */}

      <div style={catalogCardStyle}>
        <div style={catalogHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>
              Book Catalog
            </h2>

            <p style={sectionSubtitleStyle}>
              Search and review library inventory.
            </p>
          </div>

          <span style={countBadgeStyle}>
            {filteredBooks.length} book(s)
          </span>
        </div>

        {/* SEARCH */}

        <div style={searchRowStyle}>
          <div style={searchBoxStyle}>
            <span style={searchIconStyle}>
              ⌕
            </span>

            <input
              type="text"
              placeholder="Search by title or ISBN..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              style={searchInputStyle}
            />
          </div>
        </div>

        {/* TABLE */}

        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeaderRowStyle}>
                <th style={headerStyle}>ID</th>
                <th style={headerStyle}>
                  Title
                </th>
                <th style={headerStyle}>
                  ISBN
                </th>
                <th style={headerStyle}>
                  Total
                </th>
                <th style={headerStyle}>
                  Available
                </th>
                <th style={headerStyle}>
                  Status
                </th>

                {canManageBooks && (
                  <th style={headerStyle}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {filteredBooks.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      canManageBooks ? 7 : 6
                    }
                    style={emptyStyle}
                  >
                    No books found.
                  </td>
                </tr>
              ) : (
                filteredBooks.map((book) => (
                  <tr
                    key={book.id}
                    style={tableRowStyle}
                  >
                    <td style={cellStyle}>
                      {book.id}
                    </td>

                    <td style={titleCellStyle}>
                      {book.title}
                    </td>

                    <td style={cellStyle}>
                      {book.isbn || "-"}
                    </td>

                    <td style={cellStyle}>
                      {book.total_copies ?? "-"}
                    </td>

                    <td style={cellStyle}>
                      {book.available_copies ??
                        "-"}
                    </td>

                    <td style={cellStyle}>
                      {Number(
                        book.available_copies
                      ) > 0 ? (
                        <span
                          style={availableStyle}
                        >
                          Available
                        </span>
                      ) : (
                        <span
                          style={unavailableStyle}
                        >
                          Not Available
                        </span>
                      )}
                    </td>

                    {canManageBooks && (
                      <td style={cellStyle}>
                        <div
                          style={actionGroupStyle}
                        >
                          <button
                            onClick={() =>
                              handleEditBook(book)
                            }
                            style={editButtonStyle}
                          >
                            Edit
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() =>
                                handleDeactivateBook(
                                  book
                                )
                              }
                              style={
                                deactivateButtonStyle
                              }
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================================================
// SUMMARY CARD
// ==================================================

function SummaryCard({
  title,
  value,
  icon,
  background,
}) {
  return (
    <div style={summaryCardStyle}>
      <div
        style={{
          ...summaryIconStyle,
          backgroundColor: background,
        }}
      >
        {icon}
      </div>

      <div>
        <div style={summaryLabelStyle}>
          {title}
        </div>

        <div style={summaryValueStyle}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ==================================================
// STYLES
// ==================================================

const pageStyle = {
  width: "100%",
  boxSizing: "border-box",
};

const pageHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  marginBottom: "22px",
};

const pageTitleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "34px",
  fontWeight: "700",
};

const pageSubtitleStyle = {
  margin: "5px 0 0 0",
  color: "#64748b",
  fontSize: "14px",
};

// SUMMARY

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "14px",
  marginBottom: "22px",
};

const summaryCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "13px",
  backgroundColor: "#ffffff",
  padding: "15px 17px",
  borderRadius: "11px",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const summaryIconStyle = {
  width: "44px",
  height: "44px",
  minWidth: "44px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "10px",
  fontSize: "19px",
  fontWeight: "700",
};

const summaryLabelStyle = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "600",
  marginBottom: "4px",
};

const summaryValueStyle = {
  color: "#0f172a",
  fontSize: "23px",
  fontWeight: "700",
};

// FORM

const formStyle = {
  backgroundColor: "#ffffff",
  padding: "19px 20px",
  borderRadius: "12px",
  marginBottom: "22px",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const formHeaderStyle = {
  marginBottom: "15px",
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "14px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  color: "#374151",
  fontSize: "12px",
  fontWeight: "600",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 11px",
  border: "1px solid #d1d5db",
  borderRadius: "7px",
  fontSize: "13px",
  backgroundColor: "#ffffff",
  color: "#111827",
};

const formActionsStyle = {
  display: "flex",
  gap: "9px",
  marginTop: "16px",
};

const addButtonStyle = {
  padding: "10px 16px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  border: "1px solid #2563eb",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "600",
};

const cancelTopButtonStyle = {
  ...addButtonStyle,
  backgroundColor: "#ffffff",
  color: "#475569",
  border: "1px solid #cbd5e1",
};

const saveButtonStyle = {
  padding: "9px 15px",
  backgroundColor: "#16a34a",
  color: "#ffffff",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "600",
};

const secondaryButtonStyle = {
  padding: "9px 15px",
  backgroundColor: "#ffffff",
  color: "#475569",
  border: "1px solid #cbd5e1",
  borderRadius: "7px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "600",
};

// CATALOG

const catalogCardStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "18px",
  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const catalogHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "20px",
  marginBottom: "14px",
};

const sectionTitleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
  fontWeight: "700",
};

const sectionSubtitleStyle = {
  margin: "4px 0 0 0",
  color: "#64748b",
  fontSize: "12px",
};

const countBadgeStyle = {
  backgroundColor: "#dbeafe",
  color: "#1d4ed8",
  padding: "5px 10px",
  borderRadius: "16px",
  fontSize: "11px",
  fontWeight: "700",
  whiteSpace: "nowrap",
};

const searchRowStyle = {
  marginBottom: "13px",
};

const searchBoxStyle = {
  width: "330px",
  maxWidth: "100%",
  display: "flex",
  alignItems: "center",
  backgroundColor: "#ffffff",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "0 10px",
};

const searchIconStyle = {
  color: "#94a3b8",
  fontSize: "16px",
  marginRight: "7px",
};

const searchInputStyle = {
  width: "100%",
  border: "none",
  outline: "none",
  padding: "9px 0",
  fontSize: "13px",
  color: "#111827",
  backgroundColor: "transparent",
};

// TABLE

const tableContainerStyle = {
  overflowX: "auto",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
};

const tableHeaderRowStyle = {
  textAlign: "left",
  borderBottom: "1px solid #d1d5db",
  backgroundColor: "#f8fafc",
};

const tableRowStyle = {
  borderBottom: "1px solid #eef2f7",
};

const headerStyle = {
  padding: "10px 10px",
  color: "#475569",
  fontSize: "12px",
  fontWeight: "700",
  whiteSpace: "nowrap",
};

const cellStyle = {
  padding: "10px",
  color: "#475569",
  verticalAlign: "middle",
  lineHeight: "1.35",
};

const titleCellStyle = {
  ...cellStyle,
  color: "#1e293b",
  fontWeight: "600",
  maxWidth: "240px",
};

const emptyStyle = {
  padding: "24px",
  textAlign: "center",
  color: "#64748b",
  fontSize: "13px",
};

// BADGES

const availableStyle = {
  display: "inline-block",
  backgroundColor: "#dcfce7",
  color: "#166534",
  padding: "4px 8px",
  borderRadius: "12px",
  fontSize: "11px",
  fontWeight: "700",
  whiteSpace: "nowrap",
};

const unavailableStyle = {
  display: "inline-block",
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  padding: "4px 8px",
  borderRadius: "12px",
  fontSize: "11px",
  fontWeight: "700",
  whiteSpace: "nowrap",
};

// ACTIONS

const actionGroupStyle = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
};

const editButtonStyle = {
  padding: "6px 10px",
  backgroundColor: "#f59e0b",
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: "600",
};

const deactivateButtonStyle = {
  padding: "6px 10px",
  backgroundColor: "#dc2626",
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: "600",
};

// MESSAGES

const errorStyle = {
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  padding: "10px 12px",
  borderRadius: "7px",
  marginBottom: "18px",
  border: "1px solid #fecaca",
  fontSize: "13px",
};

const loadingStyle = {
  padding: "35px",
  textAlign: "center",
  color: "#64748b",
  fontSize: "14px",
};

export default Books;