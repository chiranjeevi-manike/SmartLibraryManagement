import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { API_BASE_URL } from "../config";


const PAGE_SIZE = 20;

function NotificationDeliveryMonitoring() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [sentTotal, setSentTotal] = useState(0);
  const [failedTotal, setFailedTotal] = useState(0);

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [typeFilter, setTypeFilter] =
    useState("ALL");

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem("token");

    return {
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const processResponse = useCallback(
    async (response) => {
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role_id");
        navigate("/");
        throw new Error("Authentication required.");
      }

      if (response.status === 403) {
        throw new Error(
          "Only administrators can view delivery history."
        );
      }

      if (!response.ok) {
        let message =
          "Unable to load notification delivery history.";

        try {
          const body = await response.json();
          message = body.detail || message;
        } catch {
          // Retain the default message.
        }

        throw new Error(message);
      }

      return response.json();
    },
    [navigate]
  );

  const loadData = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        skip: String((page - 1) * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      });

      if (statusFilter !== "ALL") {
        params.set(
          "delivery_status",
          statusFilter
        );
      }

      if (typeFilter !== "ALL") {
        params.set(
          "reference_type",
          typeFilter
        );
      }

      const headers = getHeaders();

      const [
        listResponse,
        sentResponse,
        failedResponse,
      ] = await Promise.all([
        fetch(
          `${API_BASE_URL}/notification-deliveries/?${params}`,
          { headers }
        ),
        fetch(
          `${API_BASE_URL}/notification-deliveries/?skip=0&limit=1&delivery_status=SENT`,
          { headers }
        ),
        fetch(
          `${API_BASE_URL}/notification-deliveries/?skip=0&limit=1&delivery_status=FAILED`,
          { headers }
        ),
      ]);

      const [
        listData,
        sentData,
        failedData,
      ] = await Promise.all([
        processResponse(listResponse),
        processResponse(sentResponse),
        processResponse(failedResponse),
      ]);

      setItems(listData.items || []);
      setTotal(listData.total || 0);
      setSentTotal(sentData.total || 0);
      setFailedTotal(failedData.total || 0);
    } catch (err) {
      if (err.message !== "Authentication required.") {
        setError(
          err.message ||
            "Unable to load notification delivery history."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [
    getHeaders,
    navigate,
    page,
    processResponse,
    statusFilter,
    typeFilter,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const changeStatusFilter = (event) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  const changeTypeFilter = (event) => {
    setTypeFilter(event.target.value);
    setPage(1);
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const normalized =
      typeof value === "string" &&
      !value.endsWith("Z") &&
      !/[+-]\d\d:\d\d$/.test(value)
        ? `${value}Z`
        : value;

    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const formatReferenceType = (value) => {
    const labels = {
      ISSUE_DUE: "Due Reminder",
      ISSUE_OVERDUE: "Overdue Reminder",
      RESERVATION_READY: "Reservation Ready",
    };

    return labels[value] || value || "-";
  };

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
  );

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Notification Delivery Monitoring
          </h1>

          <p style={styles.subtitle}>
            Review successful and failed email delivery
            attempts.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          style={styles.refreshButton}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      <div style={styles.summaryGrid}>
        <SummaryCard
          label="Total Attempts"
          value={sentTotal + failedTotal}
          color="#2563eb"
        />

        <SummaryCard
          label="Sent"
          value={sentTotal}
          color="#15803d"
        />

        <SummaryCard
          label="Failed"
          value={failedTotal}
          color="#dc2626"
        />

        <SummaryCard
          label="Current Results"
          value={total}
          color="#7c3aed"
        />
      </div>

      <div style={styles.card}>
        <div style={styles.filterRow}>
          <div>
            <h2 style={styles.sectionTitle}>
              Delivery History
            </h2>

            <p style={styles.sectionSubtitle}>
              Filter and review recent delivery attempts.
            </p>
          </div>

          <div style={styles.filters}>
            <select
              value={statusFilter}
              onChange={changeStatusFilter}
              style={styles.select}
              aria-label="Delivery status"
            >
              <option value="ALL">
                All Statuses
              </option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
            </select>

            <select
              value={typeFilter}
              onChange={changeTypeFilter}
              style={styles.select}
              aria-label="Reference type"
            >
              <option value="ALL">All Types</option>
              <option value="ISSUE_DUE">
                Due Reminder
              </option>
              <option value="ISSUE_OVERDUE">
                Overdue Reminder
              </option>
              <option value="RESERVATION_READY">
                Reservation Ready
              </option>
            </select>
          </div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Recipient</th>
                <th style={styles.th}>Subject</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Reference</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Attempted</th>
                <th style={styles.th}>Error</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={styles.empty}>
                    Loading delivery history...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="8" style={styles.empty}>
                    No notification delivery records found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    style={styles.tableRow}
                  >
                    <td style={styles.td}>
                      {item.id}
                    </td>

                    <td style={styles.td}>
                      {item.recipient}
                    </td>

                    <td style={styles.td}>
                      {item.subject}
                    </td>

                    <td style={styles.td}>
                      {formatReferenceType(
                        item.reference_type
                      )}
                    </td>

                    <td style={styles.td}>
                      {item.reference_type} #
                      {item.reference_id}
                    </td>

                    <td style={styles.td}>
                      <StatusBadge
                        status={item.delivery_status}
                      />
                    </td>

                    <td style={styles.td}>
                      {formatDate(item.attempted_at)}
                    </td>

                    <td style={styles.errorCell}>
                      {item.error_message || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.pagination}>
          <span style={styles.pageText}>
            Page {page} of {totalPages} · {total} record(s)
          </span>

          <div style={styles.pageButtons}>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() =>
                setPage((current) => current - 1)
              }
              style={styles.pageButton}
            >
              Previous
            </button>

            <button
              type="button"
              disabled={
                page >= totalPages || loading
              }
              onClick={() =>
                setPage((current) => current + 1)
              }
              style={styles.pageButton}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function SummaryCard({ label, value, color }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}>
        {label}
      </div>

      <div
        style={{
          ...styles.summaryValue,
          color,
        }}
      >
        {value ?? 0}
      </div>
    </div>
  );
}


function StatusBadge({ status }) {
  const failed = status === "FAILED";

  return (
    <span
      style={{
        ...styles.badge,
        backgroundColor: failed
          ? "#fef2f2"
          : "#ecfdf5",
        color: failed
          ? "#b91c1c"
          : "#15803d",
      }}
    >
      {status}
    </span>
  );
}


const styles = {
  page: {
    width: "100%",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "24px",
  },

  title: {
    margin: 0,
    color: "#111827",
    fontSize: "34px",
    fontWeight: "700",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  refreshButton: {
    padding: "10px 18px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontWeight: "600",
    cursor: "pointer",
  },

  error: {
    marginBottom: "18px",
    padding: "13px 16px",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: "14px",
    marginBottom: "22px",
  },

  summaryCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "18px",
    boxShadow:
      "0 3px 10px rgba(15, 23, 42, 0.05)",
  },

  summaryLabel: {
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "600",
  },

  summaryValue: {
    marginTop: "8px",
    fontSize: "27px",
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "18px",
    boxShadow:
      "0 3px 10px rgba(15, 23, 42, 0.05)",
  },

  filterRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "18px",
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "20px",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  filters: {
    display: "flex",
    gap: "10px",
  },

  select: {
    padding: "9px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    color: "#334155",
  },

  tableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },

  tableHeaderRow: {
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #cbd5e1",
  },

  tableRow: {
    borderBottom: "1px solid #e5e7eb",
  },

  th: {
    padding: "11px",
    textAlign: "left",
    color: "#475569",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "11px",
    color: "#475569",
    verticalAlign: "top",
  },

  errorCell: {
    padding: "11px",
    color: "#b91c1c",
    verticalAlign: "top",
    maxWidth: "260px",
    overflowWrap: "anywhere",
  },

  empty: {
    padding: "35px",
    textAlign: "center",
    color: "#64748b",
  },

  badge: {
    display: "inline-block",
    padding: "4px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "700",
  },

  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "18px",
  },

  pageText: {
    color: "#64748b",
    fontSize: "13px",
  },

  pageButtons: {
    display: "flex",
    gap: "8px",
  },

  pageButton: {
    padding: "8px 13px",
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    backgroundColor: "#ffffff",
    color: "#334155",
    cursor: "pointer",
  },
};


export default NotificationDeliveryMonitoring;