import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

function InventoryMonitoring() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchInventory = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/analytics/inventory-monitoring`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role_id");
        navigate("/");
        return;
      }

      if (!response.ok) {
        let message = "Unable to load inventory monitoring data.";

        try {
          const body = await response.json();
          message = body.detail || message;
        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      setData(await response.json());
    } catch (err) {
      setError(
        err.message || "Unable to load inventory monitoring data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const summary = data?.summary || {};
  const inventory = data?.inventory || [];

  const filteredInventory = useMemo(() => {
    const term = search.trim().toLowerCase();

    return inventory.filter((book) => {
      const statusMatches =
        statusFilter === "ALL" ||
        book.stock_status === statusFilter;

      const searchMatches =
        !term ||
        String(book.book_id).includes(term) ||
        (book.title || "").toLowerCase().includes(term);

      return statusMatches && searchMatches;
    });
  }, [inventory, statusFilter, search]);

  const cardStyle = {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "18px",
    boxShadow: "0 3px 10px rgba(15, 23, 42, 0.05)",
  };

  const summaryCard = (label, value, accent = "#111827", suffix = "") => (
    <div style={cardStyle}>
      <div
        style={{
          color: "#64748b",
          fontSize: "13px",
          fontWeight: "600",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: "8px",
          color: accent,
          fontSize: "27px",
          fontWeight: "700",
        }}
      >
        {value ?? 0}{suffix}
      </div>
    </div>
  );

  const stockStyle = (status) => {
    const styles = {
      IN_STOCK: {
        backgroundColor: "#ecfdf5",
        color: "#15803d",
      },
      LOW_STOCK: {
        backgroundColor: "#fffbeb",
        color: "#b45309",
      },
      OUT_OF_STOCK: {
        backgroundColor: "#fef2f2",
        color: "#b91c1c",
      },
      INACTIVE: {
        backgroundColor: "#f1f5f9",
        color: "#475569",
      },
    };

    return styles[status] || styles.INACTIVE;
  };

  const stockLabel = (status) => {
    const labels = {
      IN_STOCK: "In Stock",
      LOW_STOCK: "Low Stock",
      OUT_OF_STOCK: "Out of Stock",
      INACTIVE: "Inactive",
    };

    return labels[status] || status || "—";
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              color: "#111827",
              fontSize: "34px",
              fontWeight: "700",
            }}
          >
            Inventory & Book Stock Monitoring
          </h1>

          <p
            style={{
              margin: "7px 0 0",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Monitor book availability, stock levels, utilization,
            and reservation demand.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchInventory}
          style={{
            padding: "10px 16px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 14px",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            backgroundColor: "#fef2f2",
            color: "#b91c1c",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={cardStyle}>Loading inventory information...</div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "14px",
              marginBottom: "24px",
            }}
          >
            {summaryCard("Total Titles", summary.total_titles)}
            {summaryCard("Active Titles", summary.active_titles, "#16a34a")}
            {summaryCard("Inactive Titles", summary.inactive_titles, "#64748b")}
            {summaryCard("Total Copies", summary.total_copies)}
            {summaryCard("Available Copies", summary.available_copies, "#16a34a")}
            {summaryCard("Issued Copies", summary.issued_copies, "#2563eb")}
            {summaryCard("Low Stock", summary.low_stock_titles, "#f59e0b")}
            {summaryCard("Out of Stock", summary.out_of_stock_titles, "#dc2626")}
            {summaryCard(
              "Reservation Demand",
              summary.titles_with_reservation_demand,
              "#7c3aed"
            )}
            {summaryCard(
              "Utilization",
              Number(summary.utilization_percentage || 0).toFixed(2),
              "#2563eb",
              "%"
            )}
          </div>

          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "14px",
                marginBottom: "18px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: "#111827",
                    fontSize: "19px",
                  }}
                >
                  Book Inventory
                </h2>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  Review current stock and demand for every title.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search book or ID"
                  style={controlStyle}
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={controlStyle}
                >
                  <option value="ALL">All Stock Statuses</option>
                  <option value="IN_STOCK">In Stock</option>
                  <option value="LOW_STOCK">Low Stock</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div
              style={{
                marginBottom: "12px",
                color: "#64748b",
                fontSize: "12px",
              }}
            >
              Showing {filteredInventory.length} of {inventory.length} titles
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: "1050px",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc" }}>
                    {[
                      "Book ID",
                      "Title",
                      "Total Copies",
                      "Available",
                      "Issued",
                      "Stock Status",
                      "Reservations",
                      "Utilization",
                      "Book Status",
                    ].map((heading) => (
                      <th key={heading} style={thStyle}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        style={{
                          padding: "28px",
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        No books match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((book) => (
                      <tr key={book.book_id}>
                        <td style={tdStyle}>{book.book_id}</td>

                        <td
                          style={{
                            ...tdStyle,
                            color: "#111827",
                            fontWeight: "600",
                            minWidth: "250px",
                          }}
                        >
                          {book.title}
                        </td>

                        <td style={tdStyle}>{book.total_copies}</td>
                        <td style={tdStyle}>{book.available_copies}</td>
                        <td style={tdStyle}>{book.issued_copies}</td>

                        <td style={tdStyle}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "5px 9px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: "700",
                              whiteSpace: "nowrap",
                              ...stockStyle(book.stock_status),
                            }}
                          >
                            {stockLabel(book.stock_status)}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          <span
                            style={{
                              fontWeight:
                                book.active_reservations > 0 ? "700" : "500",
                              color:
                                book.active_reservations > 0
                                  ? "#7c3aed"
                                  : "#475569",
                            }}
                          >
                            {book.active_reservations}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          {Number(
                            book.utilization_percentage || 0
                          ).toFixed(2)}
                          %
                        </td>

                        <td style={tdStyle}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "5px 9px",
                              borderRadius: "999px",
                              backgroundColor: book.is_active
                                ? "#ecfdf5"
                                : "#f1f5f9",
                              color: book.is_active
                                ? "#15803d"
                                : "#64748b",
                              fontSize: "11px",
                              fontWeight: "700",
                            }}
                          >
                            {book.is_active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const controlStyle = {
  minWidth: "170px",
  padding: "9px 11px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  backgroundColor: "#ffffff",
  color: "#334155",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const thStyle = {
  padding: "11px 12px",
  textAlign: "left",
  borderBottom: "1px solid #e5e7eb",
  color: "#475569",
  fontWeight: "700",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
  color: "#334155",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

export default InventoryMonitoring;
