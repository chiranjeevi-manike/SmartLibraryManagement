import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Issues() {
  // ==================================================
  // STATE
  // ==================================================

  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeIssues, setActiveIssues] = useState([]);

  const [memberSearch, setMemberSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedBookId, setSelectedBookId] = useState("");

  const [loading, setLoading] = useState(true);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const [error, setError] = useState("");

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

  const isStaff = isAdmin || isLibrarian;

  // ==================================================
  // TOKEN / HEADERS
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

      let bookData = [];

      if (Array.isArray(response.data)) {
        bookData = response.data;
      } else if (
        Array.isArray(response.data.books)
      ) {
        bookData = response.data.books;
      } else if (
        Array.isArray(response.data.items)
      ) {
        bookData = response.data.items;
      } else if (
        Array.isArray(response.data.results)
      ) {
        bookData = response.data.results;
      }

      setBooks(bookData);
    } catch (error) {
      console.error("Books Error:", error);

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
  // FETCH ACTIVE ISSUES
  // ==================================================

  const fetchActiveIssues = async () => {
    try {
      if (!getToken()) {
        navigate("/");
        return;
      }

      const endpoint = isMember
        ? "http://127.0.0.1:8000/issues/me/active"
        : "http://127.0.0.1:8000/issues/active";

      const response = await axios.get(
        endpoint,
        {
          headers: getHeaders(),
        }
      );

      let issueData = [];

      if (Array.isArray(response.data)) {
        issueData = response.data;
      } else if (
        Array.isArray(response.data.issues)
      ) {
        issueData = response.data.issues;
      } else if (
        Array.isArray(response.data.items)
      ) {
        issueData = response.data.items;
      } else if (
        Array.isArray(response.data.results)
      ) {
        issueData = response.data.results;
      }

      setActiveIssues(issueData);
    } catch (error) {
      console.error(
        "Active Issues Error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Unable to load active issues."
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

      try {
        await Promise.all([
          fetchBooks(),
          fetchActiveIssues(),
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================================================
  // SEARCH MEMBERS
  // ==================================================

  const handleMemberSearch = async (e) => {
    e.preventDefault();

    if (!isStaff) {
      alert(
        "You do not have permission to search members."
      );
      return;
    }

    const searchText = memberSearch.trim();

    if (!searchText) {
      alert(
        "Enter member name, username, or email."
      );
      return;
    }

    try {
      setSearchingMembers(true);
      setMembers([]);
      setSelectedUserId("");

      const response = await axios.get(
        "http://127.0.0.1:8000/users/search",
        {
          params: {
            query: searchText,
          },
          headers: getHeaders(),
        }
      );

      let memberData = [];

      if (Array.isArray(response.data)) {
        memberData = response.data;
      } else if (
        Array.isArray(response.data.users)
      ) {
        memberData = response.data.users;
      } else if (
        Array.isArray(response.data.items)
      ) {
        memberData = response.data.items;
      } else if (
        Array.isArray(response.data.results)
      ) {
        memberData = response.data.results;
      }

      setMembers(memberData);
    } catch (error) {
      console.error(
        "Member Search Error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      alert(
        error.response?.data?.detail ||
          "Unable to search members."
      );
    } finally {
      setSearchingMembers(false);
    }
  };

  // ==================================================
  // ISSUE BOOK
  // ==================================================

  const handleIssueBook = async (e) => {
    e.preventDefault();

    if (!isStaff) {
      alert(
        "Only Admin or Librarian can issue books."
      );
      return;
    }

    if (!selectedUserId) {
      alert("Please select a member.");
      return;
    }

    if (!selectedBookId) {
      alert("Please select a book.");
      return;
    }

    try {
      setIssuing(true);

      await axios.post(
        "http://127.0.0.1:8000/issues/",
        {
          user_id: Number(selectedUserId),
          book_id: Number(selectedBookId),
        },
        {
          headers: getHeaders(),
        }
      );

      alert("Book issued successfully.");

      setSelectedUserId("");
      setSelectedBookId("");
      setMemberSearch("");
      setMembers([]);

      await Promise.all([
        fetchBooks(),
        fetchActiveIssues(),
      ]);
    } catch (error) {
      console.error(
        "Issue Book Error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      alert(
        error.response?.data?.detail ||
          "Unable to issue book."
      );
    } finally {
      setIssuing(false);
    }
  };

  // ==================================================
  // RENEW BOOK
  // ==================================================

  const handleRenewBook = async (issue) => {
    const confirmed = window.confirm(
      `Are you sure you want to renew "${getBookTitle(
        issue.book_id
      )}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await axios.put(
        `http://127.0.0.1:8000/issues/${issue.id}/renew`,
        {},
        {
          headers: getHeaders(),
        }
      );

      alert("Book renewed successfully.");

      await fetchActiveIssues();
    } catch (error) {
      console.error(
        "Renew Book Error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      alert(
        error.response?.data?.detail ||
          "Unable to renew book."
      );
    }
  };

  // ==================================================
  // RETURN BOOK
  // ==================================================

  const handleReturnBook = async (issue) => {
    if (!isStaff) {
      alert(
        "Only Admin or Librarian can process book returns."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to return "${getBookTitle(
        issue.book_id
      )}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await axios.post(
        `http://127.0.0.1:8000/issues/${issue.id}/return`,
        {},
        {
          headers: getHeaders(),
        }
      );

      const fine =
        response.data?.fine_amount ?? 0;

      if (Number(fine) > 0) {
        alert(
          `Book returned successfully.\nFine generated: ₹${fine}`
        );
      } else {
        alert(
          "Book returned successfully."
        );
      }

      await Promise.all([
        fetchBooks(),
        fetchActiveIssues(),
      ]);
    } catch (error) {
      console.error(
        "Return Book Error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      alert(
        error.response?.data?.detail ||
          "Unable to return book."
      );
    }
  };

  // ==================================================
  // HELPERS
  // ==================================================

  const getBookTitle = (bookId) => {
    const book = books.find(
      (item) =>
        Number(item.id) === Number(bookId)
    );

    return book
      ? book.title
      : `Book ID ${bookId}`;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "-";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleDateString();
  };

  const availableBooks = books.filter(
    (book) =>
      Number(book.available_copies) > 0
  );

  // ==================================================
  // SUMMARY
  // ==================================================

  const overdueCount =
    activeIssues.filter((issue) => {
      if (!issue.due_date) {
        return false;
      }

      return (
        new Date(issue.due_date) <
        new Date()
      );
    }).length;

  const totalRenewals =
    activeIssues.reduce(
      (sum, issue) =>
        sum +
        Number(
          issue.renewal_count || 0
        ),
      0
    );

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <div style={loadingStyle}>
        {isMember
          ? "Loading my issues..."
          : "Loading issues..."}
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
        <h1 style={pageTitleStyle}>
          {isMember
            ? "My Issues"
            : "Issues"}
        </h1>

        <p style={pageSubtitleStyle}>
          {isMember
            ? "View your currently borrowed books, due dates and renewals."
            : "Issue books to members and manage active issues."}
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <div style={summaryGridStyle}>
        <SummaryCard
          title="Active Issues"
          value={activeIssues.length}
          icon="📖"
          background="#dbeafe"
        />

        <SummaryCard
          title="Available Books"
          value={availableBooks.length}
          icon="📚"
          background="#dcfce7"
        />

        <SummaryCard
          title="Overdue"
          value={overdueCount}
          icon="!"
          background="#fee2e2"
        />

        <SummaryCard
          title="Renewals"
          value={totalRenewals}
          icon="↻"
          background="#ede9fe"
        />
      </div>

      {/* STAFF ISSUE FORM */}

      {isStaff && (
        <div style={formContainerStyle}>
          <div style={formHeaderStyle}>
            <h2 style={sectionTitleStyle}>
              Issue Book
            </h2>

            <p style={sectionSubtitleStyle}>
              Search for a member and issue an
              available book.
            </p>
          </div>

          {/* MEMBER SEARCH */}

          <form
            onSubmit={handleMemberSearch}
            style={memberSearchContainerStyle}
          >
            <div style={searchBoxStyle}>
              <span style={searchIconStyle}>
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search member by name, username or email..."
                value={memberSearch}
                onChange={(e) =>
                  setMemberSearch(
                    e.target.value
                  )
                }
                style={searchInputStyle}
              />
            </div>

            <button
              type="submit"
              style={searchButtonStyle}
              disabled={searchingMembers}
            >
              {searchingMembers
                ? "Searching..."
                : "Search Member"}
            </button>
          </form>

          {/* ISSUE FORM */}

          <form onSubmit={handleIssueBook}>
            <div style={formGridStyle}>
              <div>
                <label style={labelStyle}>
                  Member
                </label>

                <select
                  value={selectedUserId}
                  onChange={(e) =>
                    setSelectedUserId(
                      e.target.value
                    )
                  }
                  required
                  style={inputStyle}
                >
                  <option value="">
                    Select Member
                  </option>

                  {members.map(
                    (member) => (
                      <option
                        key={member.id}
                        value={member.id}
                      >
                        {member.full_name ||
                          member.username ||
                          member.email ||
                          `User ${member.id}`}

                        {member.username &&
                        member.full_name
                          ? ` (${member.username})`
                          : ""}
                      </option>
                    )
                  )}
                </select>

                {memberSearch &&
                  members.length === 0 &&
                  !searchingMembers && (
                    <p
                      style={
                        helperTextStyle
                      }
                    >
                      No matching users found.
                    </p>
                  )}
              </div>

              <div>
                <label style={labelStyle}>
                  Available Book
                </label>

                <select
                  value={selectedBookId}
                  onChange={(e) =>
                    setSelectedBookId(
                      e.target.value
                    )
                  }
                  required
                  style={inputStyle}
                >
                  <option value="">
                    Select Book
                  </option>

                  {availableBooks.map(
                    (book) => (
                      <option
                        key={book.id}
                        value={book.id}
                      >
                        {book.title} -{" "}
                        {
                          book.available_copies
                        }{" "}
                        available
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <button
              type="submit"
              style={issueButtonStyle}
              disabled={issuing}
            >
              {issuing
                ? "Issuing..."
                : "Issue Book"}
            </button>
          </form>
        </div>
      )}

      {/* ACTIVE ISSUES */}

      <div style={recordsCardStyle}>
        <div style={recordsHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>
              {isMember
                ? "My Active Issues"
                : "Active Issues"}
            </h2>

            <p style={sectionSubtitleStyle}>
              {isMember
                ? "Books currently borrowed by you."
                : "Currently borrowed books."}
            </p>
          </div>

          <span style={countStyle}>
            {activeIssues.length} Active
          </span>
        </div>

        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={headerRowStyle}>
                <th style={headerStyle}>
                  Issue ID
                </th>

                {isStaff && (
                  <th style={headerStyle}>
                    Member ID
                  </th>
                )}

                <th style={headerStyle}>
                  Book
                </th>

                <th style={headerStyle}>
                  Issue Date
                </th>

                <th style={headerStyle}>
                  Due Date
                </th>

                <th style={headerStyle}>
                  Renewals
                </th>

                <th style={headerStyle}>
                  Status
                </th>

                <th style={headerStyle}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {activeIssues.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      isStaff ? 8 : 7
                    }
                    style={emptyStyle}
                  >
                    {isMember
                      ? "You do not have any active issues."
                      : "No active issues found."}
                  </td>
                </tr>
              ) : (
                activeIssues.map(
                  (issue) => {
                    const overdue =
                      issue.due_date &&
                      new Date(
                        issue.due_date
                      ) < new Date();

                    return (
                      <tr
                        key={issue.id}
                        style={rowStyle}
                      >
                        <td style={cellStyle}>
                          {issue.id}
                        </td>

                        {isStaff && (
                          <td style={cellStyle}>
                            {issue.user_id}
                          </td>
                        )}

                        <td
                          style={
                            bookCellStyle
                          }
                        >
                          {getBookTitle(
                            issue.book_id
                          )}
                        </td>

                        <td style={cellStyle}>
                          {formatDate(
                            issue.issue_date
                          )}
                        </td>

                        <td style={cellStyle}>
                          <span
                            style={
                              overdue
                                ? overdueDateStyle
                                : normalDateStyle
                            }
                          >
                            {formatDate(
                              issue.due_date
                            )}
                          </span>
                        </td>

                        <td style={cellStyle}>
                          <span
                            style={
                              renewalBadgeStyle
                            }
                          >
                            {issue.renewal_count ??
                              0}
                          </span>
                        </td>

                        <td style={cellStyle}>
                          <span
                            style={
                              overdue
                                ? overdueStatusStyle
                                : statusBadgeStyle
                            }
                          >
                            {overdue
                              ? "OVERDUE"
                              : issue.status ||
                                "ISSUED"}
                          </span>
                        </td>

                        <td style={cellStyle}>
                          <div
                            style={
                              actionButtonsStyle
                            }
                          >
                            <button
                              onClick={() =>
                                handleRenewBook(
                                  issue
                                )
                              }
                              style={
                                renewButtonStyle
                              }
                            >
                              Renew
                            </button>

                            {isStaff && (
                              <button
                                onClick={() =>
                                  handleReturnBook(
                                    issue
                                  )
                                }
                                style={
                                  returnButtonStyle
                                }
                              >
                                Return
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MEMBER NOTE */}

      {isMember &&
        activeIssues.length > 0 && (
          <div style={memberInfoStyle}>
            <div style={infoIconStyle}>
              i
            </div>

            <div>
              <strong>
                Book returns are processed
                by library staff.
              </strong>

              <div style={infoTextStyle}>
                You can use Renew when your
                current issue is eligible
                for renewal.
              </div>
            </div>
          </div>
        )}
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

const formContainerStyle = {
  backgroundColor: "#ffffff",
  padding: "18px",
  borderRadius: "12px",
  marginBottom: "22px",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const formHeaderStyle = {
  marginBottom: "14px",
};

const memberSearchContainerStyle = {
  display: "flex",
  gap: "10px",
  marginBottom: "14px",
};

const searchBoxStyle = {
  flex: 1,
  display: "flex",
  alignItems: "center",
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
  padding: "9px 0",
  border: "none",
  outline: "none",
  fontSize: "13px",
  backgroundColor: "transparent",
};

const searchButtonStyle = {
  padding: "9px 14px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "12px",
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
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
};

const helperTextStyle = {
  marginTop: "6px",
  color: "#64748b",
  fontSize: "11px",
};

const issueButtonStyle = {
  marginTop: "14px",
  padding: "9px 15px",
  backgroundColor: "#16a34a",
  color: "#ffffff",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "600",
};

// RECORDS

const recordsCardStyle = {
  backgroundColor: "#ffffff",
  padding: "18px",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const recordsHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
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

const countStyle = {
  backgroundColor: "#dbeafe",
  color: "#1d4ed8",
  padding: "5px 10px",
  borderRadius: "16px",
  fontWeight: "700",
  fontSize: "11px",
  whiteSpace: "nowrap",
};

// TABLE

const tableContainerStyle = {
  width: "100%",
  overflowX: "auto",
  borderTop: "1px solid #eef2f7",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
};

const headerRowStyle = {
  textAlign: "left",
  borderBottom: "1px solid #d1d5db",
  backgroundColor: "#f8fafc",
};

const headerStyle = {
  padding: "10px",
  color: "#475569",
  whiteSpace: "nowrap",
  fontSize: "12px",
  fontWeight: "700",
};

const rowStyle = {
  borderBottom: "1px solid #eef2f7",
};

const cellStyle = {
  padding: "10px",
  color: "#475569",
  verticalAlign: "middle",
  lineHeight: "1.35",
};

const bookCellStyle = {
  ...cellStyle,
  color: "#1e293b",
  fontWeight: "600",
  maxWidth: "220px",
};

const emptyStyle = {
  textAlign: "center",
  padding: "24px",
  color: "#64748b",
  fontSize: "13px",
};

// BADGES

const statusBadgeStyle = {
  display: "inline-block",
  backgroundColor: "#dbeafe",
  color: "#1d4ed8",
  padding: "4px 8px",
  borderRadius: "12px",
  fontWeight: "700",
  fontSize: "11px",
};

const overdueStatusStyle = {
  ...statusBadgeStyle,
  backgroundColor: "#fee2e2",
  color: "#991b1b",
};

const renewalBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "24px",
  padding: "3px 7px",
  borderRadius: "10px",
  backgroundColor: "#ede9fe",
  color: "#6d28d9",
  fontSize: "11px",
  fontWeight: "700",
};

const normalDateStyle = {
  color: "#475569",
};

const overdueDateStyle = {
  color: "#dc2626",
  fontWeight: "700",
};

// ACTIONS

const actionButtonsStyle = {
  display: "flex",
  gap: "6px",
  alignItems: "center",
  flexWrap: "wrap",
};

const renewButtonStyle = {
  padding: "6px 10px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "11px",
};

const returnButtonStyle = {
  padding: "6px 10px",
  backgroundColor: "#dc2626",
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "11px",
};

// MEMBER INFO

const memberInfoStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "11px",
  marginTop: "16px",
  padding: "13px 15px",
  backgroundColor: "#eff6ff",
  color: "#1e40af",
  borderRadius: "9px",
  border: "1px solid #bfdbfe",
  fontSize: "12px",
};

const infoIconStyle = {
  width: "26px",
  height: "26px",
  minWidth: "26px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "7px",
  backgroundColor: "#dbeafe",
  color: "#2563eb",
  fontWeight: "700",
};

const infoTextStyle = {
  marginTop: "3px",
  lineHeight: "1.4",
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

export default Issues;