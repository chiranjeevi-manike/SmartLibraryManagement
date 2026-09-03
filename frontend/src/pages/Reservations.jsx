import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Reservations() {
  const [books, setBooks] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [queueData, setQueueData] = useState([]);

  const [selectedBookId, setSelectedBookId] = useState("");

  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
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
  // FETCH BOOKS
  // ==================================================

  const fetchBooks = async () => {
    try {
      if (!getToken()) {
        navigate("/");
        return;
      }

      const response = await axios.get(
        "https://smartlibrarymanagement-production.up.railway.app/books/",
        {
          headers: getHeaders(),
        }
      );

      let data = [];

      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (Array.isArray(response.data.books)) {
        data = response.data.books;
      } else if (Array.isArray(response.data.items)) {
        data = response.data.items;
      } else if (Array.isArray(response.data.results)) {
        data = response.data.results;
      }

      setBooks(data);
    } catch (error) {
      console.error("Books Error:", error);

      if (handleAuthError(error)) {
        return;
      }

      setError("Unable to load books.");
    }
  };

  // ==================================================
  // FETCH RESERVATIONS
  // ==================================================

  const fetchReservations = async () => {
    try {
      if (!getToken()) {
        navigate("/");
        return;
      }

      let response;

      if (isMember) {
        response = await axios.get(
          "https://smartlibrarymanagement-production.up.railway.app/reservations/my",
          {
            headers: getHeaders(),
          }
        );
      } else {
        response = await axios.get(
          "https://smartlibrarymanagement-production.up.railway.app/reservations/",
          {
            headers: getHeaders(),
          }
        );
      }

      let data = [];

      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (
        Array.isArray(response.data.reservations)
      ) {
        data = response.data.reservations;
      } else if (Array.isArray(response.data.items)) {
        data = response.data.items;
      } else if (Array.isArray(response.data.results)) {
        data = response.data.results;
      }

      setReservations(data);
    } catch (error) {
      console.error("Reservations Error:", error);

      if (handleAuthError(error)) {
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Unable to load reservations."
      );
    }
  };

  // ==================================================
  // FETCH MEMBER QUEUE
  // ==================================================

  const fetchQueue = async () => {
    if (!isMember) {
      setQueueData([]);
      return;
    }

    try {
      const response = await axios.get(
        "https://smartlibrarymanagement-production.up.railway.app/reservations/my/queue",
        {
          headers: getHeaders(),
        }
      );

      let data = [];

      if (
        Array.isArray(response.data.reservations)
      ) {
        data = response.data.reservations;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      }

      setQueueData(data);
    } catch (error) {
      console.error("Queue Error:", error);

      if (handleAuthError(error)) {
        return;
      }

      setQueueData([]);
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
          fetchReservations(),
          ...(isMember ? [fetchQueue()] : []),
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================================================
  // CREATE RESERVATION
  // ==================================================

  const handleReserveBook = async (e) => {
    e.preventDefault();

    if (!isMember) {
      alert("Only members can create reservations.");
      return;
    }

    if (!selectedBookId) {
      alert("Please select a book.");
      return;
    }

    try {
      setReserving(true);

      await axios.post(
        "https://smartlibrarymanagement-production.up.railway.app/reservations/",
        {
          book_id: Number(selectedBookId),
        },
        {
          headers: getHeaders(),
        }
      );

      alert("Book reserved successfully.");

      setSelectedBookId("");

      await Promise.all([
        fetchReservations(),
        fetchQueue(),
      ]);
    } catch (error) {
      console.error("Reservation Error:", error);

      if (handleAuthError(error)) {
        return;
      }

      alert(
        error.response?.data?.detail ||
          "Unable to reserve book."
      );
    } finally {
      setReserving(false);
    }
  };

  // ==================================================
  // CANCEL RESERVATION
  // ==================================================

  const handleCancelReservation = async (
    reservation
  ) => {
    const confirmed = window.confirm(
      `Cancel reservation #${reservation.id}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await axios.put(
        `https://smartlibrarymanagement-production.up.railway.app/reservations/${reservation.id}/cancel`,
        {},
        {
          headers: getHeaders(),
        }
      );

      alert("Reservation cancelled successfully.");

      if (isMember) {
        await Promise.all([
          fetchReservations(),
          fetchQueue(),
        ]);
      } else {
        await fetchReservations();
      }
    } catch (error) {
      console.error(
        "Cancel Reservation Error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      alert(
        error.response?.data?.detail ||
          "Unable to cancel reservation."
      );
    }
  };

  // ==================================================
  // FULFILL RESERVATION
  // ==================================================

  const handleFulfillReservation = async (
    reservation
  ) => {
    if (!isStaff) {
      return;
    }

    if (reservation.status !== "READY") {
      alert(
        "Only READY reservations can be fulfilled."
      );
      return;
    }

    const confirmed = window.confirm(
      `Fulfill reservation #${reservation.id}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await axios.put(
        `https://smartlibrarymanagement-production.up.railway.app/reservations/${reservation.id}/fulfill`,
        {},
        {
          headers: getHeaders(),
        }
      );

      alert("Reservation fulfilled successfully.");

      await Promise.all([
        fetchReservations(),
        fetchBooks(),
      ]);
    } catch (error) {
      console.error(
        "Fulfill Reservation Error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      alert(
        error.response?.data?.detail ||
          "Unable to fulfill reservation."
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

    return date.toLocaleString();
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "READY":
        return {
          ...statusStyle,
          backgroundColor: "#dcfce7",
          color: "#166534",
        };

      case "ACTIVE":
        return {
          ...statusStyle,
          backgroundColor: "#dbeafe",
          color: "#1d4ed8",
        };

      case "FULFILLED":
        return {
          ...statusStyle,
          backgroundColor: "#e0e7ff",
          color: "#3730a3",
        };

      case "EXPIRED":
        return {
          ...statusStyle,
          backgroundColor: "#fee2e2",
          color: "#991b1b",
        };

      case "CANCELLED":
        return {
          ...statusStyle,
          backgroundColor: "#f3f4f6",
          color: "#4b5563",
        };

      default:
        return statusStyle;
    }
  };

  const getQueueItem = (reservationId) => {
    return queueData.find(
      (item) =>
        Number(item.reservation_id) ===
        Number(reservationId)
    );
  };

  const reservableBooks = books.filter(
    (book) =>
      Number(book.available_copies) === 0
  );

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <div style={loadingStyle}>
        Loading reservations...
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
            ? "My Reservations"
            : "Reservations"}
        </h1>

        <p style={pageSubtitleStyle}>
          {isMember
            ? "Reserve unavailable books and track your queue position."
            : "Manage library reservation requests and pickups."}
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {/* MEMBER RESERVATION FORM */}

      {isMember && (
        <div style={formContainerStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>
              Reserve Book
            </h2>

            <p style={sectionSubtitleStyle}>
              Only books with no available copies can
              be reserved.
            </p>
          </div>

          <form onSubmit={handleReserveBook}>
            <div style={formRowStyle}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>
                  Book
                </label>

                <select
                  value={selectedBookId}
                  onChange={(e) =>
                    setSelectedBookId(
                      e.target.value
                    )
                  }
                  style={inputStyle}
                >
                  <option value="">
                    Select unavailable book
                  </option>

                  {reservableBooks.map((book) => (
                    <option
                      key={book.id}
                      value={book.id}
                    >
                      {book.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                style={reserveButtonStyle}
                disabled={reserving}
              >
                {reserving
                  ? "Reserving..."
                  : "Reserve Book"}
              </button>
            </div>
          </form>

          {reservableBooks.length === 0 && (
            <p style={noBooksStyle}>
              No unavailable books currently require
              reservation.
            </p>
          )}
        </div>
      )}

      {/* RESERVATION RECORDS */}

      <div style={recordsSectionStyle}>
        <div style={recordsHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>
              {isMember
                ? "My Reservation Records"
                : "Reservation Records"}
            </h2>

            <p style={sectionSubtitleStyle}>
              {isMember
                ? "Status and queue information for your reservations."
                : "Review active, ready, fulfilled and cancelled reservations."}
            </p>
          </div>

          <span style={countStyle}>
            {reservations.length} Reservation(s)
          </span>
        </div>

        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={headerRowStyle}>
                <th style={headerStyle}>ID</th>

                {!isMember && (
                  <th style={headerStyle}>
                    User ID
                  </th>
                )}

                <th style={headerStyle}>Book</th>

                <th style={headerStyle}>
                  Reserved At
                </th>

                <th style={headerStyle}>
                  Ready Until
                </th>

                <th style={headerStyle}>Status</th>

                {isMember && (
                  <>
                    <th style={headerStyle}>
                      Queue Position
                    </th>

                    <th style={headerStyle}>
                      People Ahead
                    </th>
                  </>
                )}

                <th style={headerStyle}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {reservations.length === 0 ? (
                <tr>
                  <td
                    colSpan={isMember ? 8 : 7}
                    style={emptyStyle}
                  >
                    No reservations found.
                  </td>
                </tr>
              ) : (
                reservations.map(
                  (reservation) => {
                    const queueItem = isMember
                      ? getQueueItem(
                          reservation.id
                        )
                      : null;

                    return (
                      <tr
                        key={reservation.id}
                        style={rowStyle}
                      >
                        <td style={cellStyle}>
                          {reservation.id}
                        </td>

                        {!isMember && (
                          <td style={cellStyle}>
                            {reservation.user_id ??
                              "-"}
                          </td>
                        )}

                        <td style={bookCellStyle}>
                          {getBookTitle(
                            reservation.book_id
                          )}
                        </td>

                        <td style={cellStyle}>
                          {formatDate(
                            reservation.reserved_at
                          )}
                        </td>

                        <td style={cellStyle}>
                          {formatDate(
                            reservation.ready_until
                          )}
                        </td>

                        <td style={cellStyle}>
                          <span
                            style={getStatusStyle(
                              reservation.status
                            )}
                          >
                            {reservation.status}
                          </span>
                        </td>

                        {isMember && (
                          <>
                            <td style={cellStyle}>
                              {queueItem
                                ? queueItem.queue_position
                                : "-"}
                            </td>

                            <td style={cellStyle}>
                              {queueItem
                                ? queueItem.people_ahead
                                : "-"}
                            </td>
                          </>
                        )}

                        <td style={cellStyle}>
                          <div style={actionContainerStyle}>
                            {isMember &&
                              [
                                "ACTIVE",
                                "READY",
                              ].includes(
                                reservation.status
                              ) && (
                                <button
                                  onClick={() =>
                                    handleCancelReservation(
                                      reservation
                                    )
                                  }
                                  style={
                                    cancelButtonStyle
                                  }
                                >
                                  Cancel
                                </button>
                              )}

                            {isStaff &&
                              reservation.status ===
                                "ACTIVE" && (
                                <button
                                  onClick={() =>
                                    handleCancelReservation(
                                      reservation
                                    )
                                  }
                                  style={
                                    cancelButtonStyle
                                  }
                                >
                                  Cancel
                                </button>
                              )}

                            {isStaff &&
                              reservation.status ===
                                "READY" && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleFulfillReservation(
                                        reservation
                                      )
                                    }
                                    style={
                                      fulfillButtonStyle
                                    }
                                  >
                                    Fulfill
                                  </button>

                                  <button
                                    onClick={() =>
                                      handleCancelReservation(
                                        reservation
                                      )
                                    }
                                    style={
                                      cancelButtonStyle
                                    }
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}

                            {![
                              "ACTIVE",
                              "READY",
                            ].includes(
                              reservation.status
                            ) && (
                              <span style={dashStyle}>
                                -
                              </span>
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
  fontSize: "34px",
  fontWeight: "700",
  color: "#111827",
};

const pageSubtitleStyle = {
  margin: "5px 0 0 0",
  color: "#64748b",
  fontSize: "14px",
};

const sectionHeaderStyle = {
  marginBottom: "15px",
};

const sectionTitleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
  fontWeight: "700",
};

const sectionSubtitleStyle = {
  margin: "5px 0 0 0",
  color: "#64748b",
  fontSize: "13px",
};

const formContainerStyle = {
  backgroundColor: "#ffffff",
  padding: "18px 20px",
  borderRadius: "12px",
  marginBottom: "24px",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const formRowStyle = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-end",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "13px",
  fontWeight: "600",
  color: "#374151",
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

const reserveButtonStyle = {
  padding: "10px 16px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "13px",
};

const noBooksStyle = {
  color: "#64748b",
  fontSize: "12px",
  marginTop: "12px",
  marginBottom: 0,
};

const errorStyle = {
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  padding: "10px 12px",
  borderRadius: "7px",
  marginBottom: "18px",
  border: "1px solid #fecaca",
  fontSize: "13px",
};

const recordsSectionStyle = {
  marginTop: "4px",
};

const recordsHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  marginBottom: "12px",
};

const countStyle = {
  backgroundColor: "#dbeafe",
  color: "#1d4ed8",
  padding: "6px 11px",
  borderRadius: "18px",
  fontWeight: "600",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const tableContainerStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "10px 14px",
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
};

const headerRowStyle = {
  textAlign: "left",
  borderBottom: "1px solid #d1d5db",
};

const headerStyle = {
  padding: "11px 10px",
  color: "#374151",
  fontSize: "13px",
  fontWeight: "700",
  whiteSpace: "nowrap",
};

const rowStyle = {
  borderBottom: "1px solid #eef2f7",
};

const cellStyle = {
  padding: "11px 10px",
  color: "#475569",
  verticalAlign: "middle",
  lineHeight: "1.35",
};

const bookCellStyle = {
  ...cellStyle,
  color: "#334155",
  fontWeight: "600",
  maxWidth: "180px",
};

const emptyStyle = {
  textAlign: "center",
  padding: "24px",
  color: "#6b7280",
  fontSize: "13px",
};

const statusStyle = {
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: "12px",
  fontWeight: "700",
  fontSize: "11px",
  backgroundColor: "#f3f4f6",
  color: "#374151",
  whiteSpace: "nowrap",
};

const actionContainerStyle = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
};

const fulfillButtonStyle = {
  padding: "6px 10px",
  backgroundColor: "#16a34a",
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "11px",
};

const cancelButtonStyle = {
  padding: "6px 10px",
  backgroundColor: "#dc2626",
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "11px",
};

const dashStyle = {
  color: "#9ca3af",
  fontSize: "12px",
};

const loadingStyle = {
  padding: "35px",
  textAlign: "center",
  color: "#64748b",
  fontSize: "14px",
};

export default Reservations;
