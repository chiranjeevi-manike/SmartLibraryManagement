import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

function DueMonitoring() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [activeView, setActiveView] = useState("overdue");
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
        `${API_BASE_URL}/analytics/due-monitoring`,
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
        let message = "Unable to load due monitoring data.";

        try {
          const body = await response.json();
          message = body.detail || message;
        } catch {
          // Keep default error message.
        }

        throw new Error(message);
      }

      setData(await response.json());
    } catch (err) {
      setError(err.message || "Unable to load due monitoring data.");
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

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString();
  };

  const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const summary = data?.summary || {};
  const dueToday = data?.due_today || [];
  const dueSoon = data?.due_next_3_days || [];
  const overdue = data?.overdue || [];

  const views = {
    overdue: {
      title: "Overdue Books",
      subtitle: "Books that have passed their due date.",
      rows: overdue,
    },
    today: {
      title: "Due Today",
      subtitle: "Books that must be returned today.",
      rows: dueToday,
    },
    soon: {
      title: "Due in Next 3 Days",
      subtitle: "Upcoming returns requiring attention.",
      rows: dueSoon,
    },
  };

  const current = views[activeView];

  const card = {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "19px",
    boxShadow: "0 3px 10px rgba(15, 23, 42, 0.05)",
  };

  const summaryCard = (label, value, key, accent) => (
    <button
      type="button"
      onClick={() => key && setActiveView(key)}
      style={{
        ...card,
        width: "100%",
        textAlign: "left",
        cursor: key ? "pointer" : "default",
        border:
          key && activeView === key
            ? `2px solid ${accent}`
            : "1px solid #e5e7eb",
        backgroundColor:
          key && activeView === key ? "#f8fafc" : "#ffffff",
      }}
    >
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
          fontSize: "28px",
          fontWeight: "700",
        }}
      >
        {value}
      </div>
    </button>
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
            Due-Date & Overdue Monitoring
          </h1>

          <p
            style={{
              margin: "7px 0 0",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Track upcoming due dates, overdue books, members, and estimated fines.
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
        <div style={card}>Loading due-date information...</div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "14px",
              marginBottom: "26px",
            }}
          >
            {summaryCard(
              "Due Today",
              summary.due_today ?? 0,
              "today",
              "#f59e0b"
            )}

            {summaryCard(
              "Due in Next 3 Days",
              summary.due_next_3_days ?? 0,
              "soon",
              "#2563eb"
            )}

            {summaryCard(
              "Overdue Books",
              summary.overdue ?? 0,
              "overdue",
              "#dc2626"
            )}

            {summaryCard(
              "Total Monitored",
              summary.total_monitored ?? 0,
              null,
              "#111827"
            )}

            {summaryCard(
              "Estimated Overdue Fines",
              money(summary.estimated_overdue_fines),
              null,
              "#dc2626"
            )}
          </div>

          <div style={card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "14px",
                marginBottom: "17px",
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
                  {current.title}
                </h2>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  {current.subtitle}
                </p>
              </div>

              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: "999px",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  fontSize: "12px",
                  fontWeight: "700",
                }}
              >
                {current.rows.length} record
                {current.rows.length === 1 ? "" : "s"}
              </span>
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
                      "Issue ID",
                      "Member",
                      "Email",
                      "Book",
                      "Issued",
                      "Due Date",
                      "Status",
                      "Overdue Days",
                      "Estimated Fine",
                      "Recorded Fine",
                      "Fine Status",
                    ].map((heading) => (
                      <th key={heading} style={thStyle}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {current.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan="11"
                        style={{
                          padding: "26px",
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        No records found in this category.
                      </td>
                    </tr>
                  ) : (
                    current.rows.map((item) => {
                      const isOverdue = item.category === "OVERDUE";
                      const isToday = item.category === "DUE_TODAY";

                      return (
                        <tr key={item.issue_id}>
                          <td style={tdStyle}>{item.issue_id}</td>

                          <td style={tdStyle}>
                            <div
                              style={{
                                color: "#111827",
                                fontWeight: "600",
                              }}
                            >
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

                          <td style={tdStyle}>{item.email || "—"}</td>

                          <td
                            style={{
                              ...tdStyle,
                              color: "#111827",
                              fontWeight: "600",
                            }}
                          >
                            {item.book_title || "—"}
                          </td>

                          <td style={tdStyle}>
                            {formatDate(item.issue_date)}
                          </td>

                          <td style={tdStyle}>
                            {formatDate(item.due_date)}
                          </td>

                          <td style={tdStyle}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 9px",
                                borderRadius: "999px",
                                backgroundColor: isOverdue
                                  ? "#fef2f2"
                                  : isToday
                                  ? "#fffbeb"
                                  : "#eff6ff",
                                color: isOverdue
                                  ? "#b91c1c"
                                  : isToday
                                  ? "#b45309"
                                  : "#1d4ed8",
                                fontSize: "11px",
                                fontWeight: "700",
                              }}
                            >
                              {isOverdue
                                ? "OVERDUE"
                                : isToday
                                ? "DUE TODAY"
                                : "DUE SOON"}
                            </span>
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              color: isOverdue ? "#dc2626" : "#334155",
                              fontWeight: isOverdue ? "700" : "400",
                            }}
                          >
                            {item.overdue_days ?? 0}
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              color: isOverdue ? "#dc2626" : "#334155",
                              fontWeight: isOverdue ? "700" : "400",
                            }}
                          >
                            {money(item.estimated_fine)}
                          </td>

                          <td style={tdStyle}>
                            {money(item.recorded_fine)}
                          </td>

                          <td style={tdStyle}>
                            {item.fine_status || "—"}
                          </td>
                        </tr>
                      );
                    })
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

export default DueMonitoring;
