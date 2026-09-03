import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "https://smartlibrarymanagement-production.up.railway.app";

function LibraryActivity() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchActivity = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/analytics/library-activity?recent_limit=15`,
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
        let message = "Unable to load library activity.";

        try {
          const result = await response.json();
          message = result.detail || message;
        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message || "Unable to load library activity.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
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

  const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const cardStyle = {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 3px 10px rgba(15, 23, 42, 0.05)",
  };

  const labelStyle = {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "600",
  };

  const valueStyle = {
    margin: "8px 0 0",
    color: "#111827",
    fontSize: "28px",
    fontWeight: "700",
  };

  if (loading) {
    return (
      <div>
        <h1 style={{ margin: 0, color: "#111827", fontSize: "34px" }}>
          Library Activity
        </h1>
        <p style={{ color: "#64748b" }}>Loading activity data...</p>
      </div>
    );
  }

  const today = data?.today || {};
  const circulation = data?.current_circulation || {};
  const activity = data?.recent_activity || [];

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
            Library Activity
          </h1>

          <p
            style={{
              margin: "7px 0 0",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Monitor today's transactions and current library circulation.
          </p>
        </div>

        <button
          onClick={fetchActivity}
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

      <h2
        style={{
          margin: "0 0 14px",
          color: "#111827",
          fontSize: "19px",
        }}
      >
        Today's Activity
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        <div style={cardStyle}>
          <p style={labelStyle}>Books Issued</p>
          <p style={valueStyle}>{today.issued ?? 0}</p>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>Books Returned</p>
          <p style={valueStyle}>{today.returned ?? 0}</p>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>New Reservations</p>
          <p style={valueStyle}>{today.reservations ?? 0}</p>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>Fines Collected</p>
          <p style={valueStyle}>{money(today.fines_collected)}</p>
        </div>
      </div>

      <h2
        style={{
          margin: "0 0 14px",
          color: "#111827",
          fontSize: "19px",
        }}
      >
        Current Circulation
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        <div style={cardStyle}>
          <p style={labelStyle}>Currently Issued</p>
          <p style={valueStyle}>{circulation.currently_issued ?? 0}</p>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>Overdue Books</p>
          <p
            style={{
              ...valueStyle,
              color:
                Number(circulation.overdue_books || 0) > 0
                  ? "#dc2626"
                  : "#111827",
            }}
          >
            {circulation.overdue_books ?? 0}
          </p>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>Active Reservations</p>
          <p style={valueStyle}>{circulation.active_reservations ?? 0}</p>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>Ready for Pickup</p>
          <p style={valueStyle}>{circulation.ready_for_pickup ?? 0}</p>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>Outstanding Fines</p>
          <p
            style={{
              ...valueStyle,
              color:
                Number(circulation.outstanding_fines || 0) > 0
                  ? "#dc2626"
                  : "#111827",
            }}
          >
            {money(circulation.outstanding_fines)}
          </p>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ marginBottom: "16px" }}>
          <h2
            style={{
              margin: 0,
              color: "#111827",
              fontSize: "19px",
            }}
          >
            Recent Circulation Activity
          </h2>

          <p
            style={{
              margin: "5px 0 0",
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            Latest issue and return records.
          </p>
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
                  "Issue ID",
                  "Member",
                  "Book",
                  "Issued",
                  "Due",
                  "Returned",
                  "Status",
                  "Overdue",
                  "Fine",
                  "Fine Status",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: "11px 12px",
                      textAlign: "left",
                      borderBottom: "1px solid #e5e7eb",
                      color: "#475569",
                      fontWeight: "700",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {activity.length === 0 ? (
                <tr>
                  <td
                    colSpan="10"
                    style={{
                      padding: "24px",
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    No circulation activity found.
                  </td>
                </tr>
              ) : (
                activity.map((item) => (
                  <tr key={item.issue_id}>
                    <td style={cellStyle}>{item.issue_id}</td>

                    <td style={cellStyle}>
                      <div style={{ fontWeight: "600", color: "#111827" }}>
                        {item.full_name || item.username || "—"}
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

                    <td style={{ ...cellStyle, fontWeight: "600" }}>
                      {item.book_title || "—"}
                    </td>

                    <td style={cellStyle}>{formatDate(item.issue_date)}</td>
                    <td style={cellStyle}>{formatDate(item.due_date)}</td>
                    <td style={cellStyle}>{formatDate(item.return_date)}</td>

                    <td style={cellStyle}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: "999px",
                          backgroundColor:
                            item.status === "ISSUED"
                              ? "#eff6ff"
                              : "#f0fdf4",
                          color:
                            item.status === "ISSUED"
                              ? "#1d4ed8"
                              : "#15803d",
                          fontSize: "11px",
                          fontWeight: "700",
                        }}
                      >
                        {item.status || "—"}
                      </span>
                    </td>

                    <td style={cellStyle}>{item.overdue_days ?? 0} days</td>
                    <td style={cellStyle}>{money(item.fine_amount)}</td>
                    <td style={cellStyle}>{item.fine_status || "—"}</td>
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

const cellStyle = {
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
  color: "#334155",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

export default LibraryActivity;

