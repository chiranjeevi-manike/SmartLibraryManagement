import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

function ReminderMonitoring() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/analytics/reminder-monitoring?recent_limit=100`,
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
        let message = "Unable to load reminder monitoring data.";

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
        err.message || "Unable to load reminder monitoring data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (value) => {
    if (!value) return "—";

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

  const typeLabel = (type) => {
    const labels = {
      DUE_REMINDER: "Due Reminder",
      OVERDUE: "Overdue Alert",
      RESERVATION_READY: "Reservation Ready",
      RESERVATION_EXPIRED: "Reservation Expired",
      FINE_GENERATED: "Fine Generated",
      FINE_PAID: "Fine Paid",
      RENEWAL_SUCCESS: "Renewal Success",
    };

    return labels[type] || type || "Notification";
  };

  const typeStyle = (type) => {
    const styles = {
      DUE_REMINDER: {
        backgroundColor: "#fffbeb",
        color: "#b45309",
      },
      OVERDUE: {
        backgroundColor: "#fef2f2",
        color: "#b91c1c",
      },
      RESERVATION_READY: {
        backgroundColor: "#ecfdf5",
        color: "#047857",
      },
      RESERVATION_EXPIRED: {
        backgroundColor: "#f1f5f9",
        color: "#475569",
      },
      FINE_GENERATED: {
        backgroundColor: "#fff7ed",
        color: "#c2410c",
      },
      FINE_PAID: {
        backgroundColor: "#ecfdf5",
        color: "#15803d",
      },
      RENEWAL_SUCCESS: {
        backgroundColor: "#eff6ff",
        color: "#1d4ed8",
      },
    };

    return (
      styles[type] || {
        backgroundColor: "#f1f5f9",
        color: "#475569",
      }
    );
  };

  const summary = data?.summary || {};
  const reminders = data?.recent_reminders || [];

  const filteredReminders = useMemo(() => {
    return reminders.filter((item) => {
      const typeMatches =
        typeFilter === "ALL" ||
        item.notification_type === typeFilter;

      const statusMatches =
        statusFilter === "ALL" ||
        (statusFilter === "READ" && item.is_read) ||
        (statusFilter === "UNREAD" && !item.is_read);

      return typeMatches && statusMatches;
    });
  }, [reminders, typeFilter, statusFilter]);

  const cardStyle = {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "18px",
    boxShadow: "0 3px 10px rgba(15, 23, 42, 0.05)",
  };

  const summaryCard = (label, value, accent = "#111827") => (
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
        {value ?? 0}
      </div>
    </div>
  );

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
            Automated Reminder Management
          </h1>

          <p
            style={{
              margin: "7px 0 0",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Monitor generated reminders, member notifications,
            and read/unread delivery status.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
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
        <div style={cardStyle}>
          Loading reminder information...
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(175px, 1fr))",
              gap: "14px",
              marginBottom: "24px",
            }}
          >
            {summaryCard(
              "Total Notifications",
              summary.total_notifications
            )}
            {summaryCard(
              "Unread",
              summary.unread,
              "#dc2626"
            )}
            {summaryCard(
              "Read",
              summary.read,
              "#16a34a"
            )}
            {summaryCard(
              "Due Reminders",
              summary.due_reminders,
              "#f59e0b"
            )}
            {summaryCard(
              "Overdue Alerts",
              summary.overdue_alerts,
              "#dc2626"
            )}
            {summaryCard(
              "Reservation Ready",
              summary.reservation_ready,
              "#16a34a"
            )}
            {summaryCard(
              "Reservation Expired",
              summary.reservation_expired,
              "#64748b"
            )}
            {summaryCard(
              "Fine Generated",
              summary.fine_generated,
              "#c2410c"
            )}
            {summaryCard(
              "Fine Paid",
              summary.fine_paid,
              "#16a34a"
            )}
            {summaryCard(
              "Renewal Success",
              summary.renewal_success,
              "#2563eb"
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
                  Recent Reminder Records
                </h2>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  Latest automated member notifications.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <select
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter(e.target.value)
                  }
                  style={selectStyle}
                >
                  <option value="ALL">All Types</option>
                  <option value="DUE_REMINDER">
                    Due Reminder
                  </option>
                  <option value="OVERDUE">
                    Overdue Alert
                  </option>
                  <option value="RESERVATION_READY">
                    Reservation Ready
                  </option>
                  <option value="RESERVATION_EXPIRED">
                    Reservation Expired
                  </option>
                  <option value="FINE_GENERATED">
                    Fine Generated
                  </option>
                  <option value="FINE_PAID">
                    Fine Paid
                  </option>
                  <option value="RENEWAL_SUCCESS">
                    Renewal Success
                  </option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value)
                  }
                  style={selectStyle}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="UNREAD">Unread</option>
                  <option value="READ">Read</option>
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
              Showing {filteredReminders.length} of{" "}
              {reminders.length} recent records
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: "1180px",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc" }}>
                    {[
                      "ID",
                      "Member",
                      "Email",
                      "Type",
                      "Message",
                      "Status",
                      "Generated At",
                    ].map((heading) => (
                      <th key={heading} style={thStyle}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredReminders.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        style={{
                          padding: "28px",
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        No reminder records match the selected
                        filters.
                      </td>
                    </tr>
                  ) : (
                    filteredReminders.map((item) => (
                      <tr key={item.id}>
                        <td style={tdStyle}>{item.id}</td>

                        <td style={tdStyle}>
                          <div
                            style={{
                              color: "#111827",
                              fontWeight: "600",
                            }}
                          >
                            {item.full_name ||
                              item.username ||
                              "—"}
                          </div>

                          <div
                            style={{
                              marginTop: "3px",
                              color: "#64748b",
                              fontSize: "12px",
                            }}
                          >
                            @{item.username || "—"}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          {item.email || "—"}
                        </td>

                        <td style={tdStyle}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "5px 9px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: "700",
                              whiteSpace: "nowrap",
                              ...typeStyle(
                                item.notification_type
                              ),
                            }}
                          >
                            {typeLabel(
                              item.notification_type
                            )}
                          </span>
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            minWidth: "330px",
                            whiteSpace: "normal",
                            lineHeight: "1.45",
                          }}
                        >
                          {item.message || "—"}
                        </td>

                        <td style={tdStyle}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "5px 9px",
                              borderRadius: "999px",
                              backgroundColor: item.is_read
                                ? "#ecfdf5"
                                : "#fef2f2",
                              color: item.is_read
                                ? "#15803d"
                                : "#b91c1c",
                              fontSize: "11px",
                              fontWeight: "700",
                            }}
                          >
                            {item.is_read
                              ? "READ"
                              : "UNREAD"}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          {formatDate(item.created_at)}
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

const selectStyle = {
  minWidth: "155px",
  padding: "9px 11px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  backgroundColor: "#ffffff",
  color: "#334155",
  fontSize: "13px",
  outline: "none",
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
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

export default ReminderMonitoring;
