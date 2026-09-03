import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

function SystemHealth() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHealth = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/analytics/system-health`,
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
        let message = "Unable to load system health data.";
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
      setError(err.message || "Unable to load system health data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const summary = data?.summary || {};
  const checks = data?.data_checks || {};
  const warnings = data?.warning_conditions || [];
  const critical = data?.critical_conditions || [];
  const inventoryWarnings = data?.inventory_warnings || [];

  const status = data?.overall_status || "UNKNOWN";
  const statusTheme = getStatusTheme(status);

  return (
    <div>
      <div style={headerRow}>
        <div>
          <h1 style={titleStyle}>
            System Health & Operational Monitoring
          </h1>
          <p style={subtitleStyle}>
            Consolidated operational, circulation, security,
            notification, inventory, and data-health indicators.
          </p>
        </div>

        <button onClick={loadHealth} style={refreshButton}>
          Refresh
        </button>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {loading ? (
        <div style={cardStyle}>Loading system health...</div>
      ) : (
        <>
          <div
            style={{
              ...cardStyle,
              marginBottom: "20px",
              borderLeft: `5px solid ${statusTheme.color}`,
              backgroundColor: statusTheme.background,
            }}
          >
            <div style={statusRow}>
              <div>
                <div style={sectionLabel}>OVERALL SYSTEM STATUS</div>
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "29px",
                    fontWeight: "800",
                    color: statusTheme.color,
                  }}
                >
                  {status}
                </div>
              </div>

              <StatusBadge status={status} />

              <div
                style={{
                  color: "#64748b",
                  fontSize: "12px",
                  textAlign: "right",
                }}
              >
                Last checked
                <div
                  style={{
                    marginTop: "4px",
                    color: "#334155",
                    fontWeight: "600",
                  }}
                >
                  {formatDateTime(data?.checked_at)}
                </div>
              </div>
            </div>
          </div>

          <div style={gridStyle}>
            <SummaryCard label="Total Users" value={summary.total_users} />
            <SummaryCard
              label="Active Users"
              value={summary.active_users}
              tone="good"
            />
            <SummaryCard
              label="Locked Accounts"
              value={summary.currently_locked_accounts}
              tone={summary.currently_locked_accounts > 0 ? "bad" : "good"}
            />
            <SummaryCard
              label="Currently Issued"
              value={summary.currently_issued_books}
            />
            <SummaryCard
              label="Overdue Books"
              value={summary.overdue_books}
              tone={summary.overdue_books > 0 ? "bad" : "good"}
            />
            <SummaryCard
              label="Unpaid Fine Cases"
              value={summary.unpaid_fine_cases}
              tone={summary.unpaid_fine_cases > 0 ? "warn" : "good"}
            />
            <SummaryCard
              label="Outstanding Fines"
              value={formatINR(summary.outstanding_fines)}
              tone={Number(summary.outstanding_fines) > 0 ? "warn" : "good"}
            />
            <SummaryCard
              label="Active Reservations"
              value={summary.active_reservations}
              tone={summary.active_reservations > 0 ? "warn" : "good"}
            />
            <SummaryCard
              label="Ready for Pickup"
              value={summary.ready_for_pickup}
            />
            <SummaryCard
              label="Unread Notifications"
              value={summary.unread_notifications}
              tone={summary.unread_notifications > 10 ? "warn" : "good"}
            />
            <SummaryCard
              label="Low Stock Titles"
              value={summary.low_stock_titles}
              tone={summary.low_stock_titles > 0 ? "warn" : "good"}
            />
            <SummaryCard
              label="Out of Stock"
              value={summary.out_of_stock_titles}
              tone={summary.out_of_stock_titles > 0 ? "bad" : "good"}
            />
            <SummaryCard
              label="Data Issues"
              value={summary.data_consistency_issues}
              tone={summary.data_consistency_issues > 0 ? "bad" : "good"}
            />
          </div>

          <div style={twoColumnGrid}>
            <ConditionPanel
              title="Critical Conditions"
              items={critical}
              emptyText="No critical operational conditions."
              tone="bad"
            />
            <ConditionPanel
              title="Warning Conditions"
              items={warnings}
              emptyText="No warning conditions."
              tone="warn"
            />
          </div>

          <div style={twoColumnGrid}>
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Data Consistency Checks</h2>
              <p style={sectionSubtitle}>
                Database-level conditions that may require administrative review.
              </p>

              <CheckRow
                label="Issued records without due date"
                value={checks.issued_without_due_date}
              />
              <CheckRow
                label="Returned records without return date"
                value={checks.returned_without_return_date}
              />
              <CheckRow
                label="Reservations for inactive books"
                value={checks.active_reservations_for_inactive_books}
              />
              <CheckRow
                label="Negative stock titles"
                value={checks.negative_stock_titles}
              />
              <CheckRow
                label="Copy-count mismatches"
                value={checks.copy_count_mismatches}
              />
            </div>

            <div style={cardStyle}>
              <h2 style={sectionTitle}>Operational Snapshot</h2>
              <p style={sectionSubtitle}>
                Key current workload indicators.
              </p>

              <CheckRow
                label="Inactive users"
                value={summary.inactive_users}
                neutral
              />
              <CheckRow
                label="Expired READY reservations"
                value={summary.expired_ready_waiting}
              />
              <CheckRow
                label="Active book titles"
                value={summary.active_book_titles}
                neutral
              />
              <CheckRow
                label="Ready reservations"
                value={summary.ready_for_pickup}
                neutral
              />
              <CheckRow
                label="Active reservations"
                value={summary.active_reservations}
                neutral
              />
            </div>
          </div>

          <div style={{ ...cardStyle, marginTop: "20px" }}>
            <div style={tableHeaderRow}>
              <div>
                <h2 style={sectionTitle}>Inventory Warnings</h2>
                <p style={sectionSubtitle}>
                  Active titles requiring stock or copy-count attention.
                </p>
              </div>
              <div style={countPill}>
                {inventoryWarnings.length} record(s)
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc" }}>
                    {[
                      "Book ID",
                      "Title",
                      "Total Copies",
                      "Available",
                      "Issued",
                      "Warnings",
                    ].map((heading) => (
                      <th key={heading} style={thStyle}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {inventoryWarnings.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={emptyTableStyle}>
                        No inventory warnings.
                      </td>
                    </tr>
                  ) : (
                    inventoryWarnings.map((book) => (
                      <tr key={book.book_id}>
                        <td style={tdStyle}>{book.book_id}</td>
                        <td
                          style={{
                            ...tdStyle,
                            minWidth: "240px",
                            fontWeight: "600",
                            color: "#111827",
                          }}
                        >
                          {book.title}
                        </td>
                        <td style={tdStyle}>{book.total_copies}</td>
                        <td style={tdStyle}>{book.available_copies}</td>
                        <td style={tdStyle}>{book.issued_copies}</td>
                        <td
                          style={{
                            ...tdStyle,
                            minWidth: "300px",
                            whiteSpace: "normal",
                          }}
                        >
                          <div style={badgeWrap}>
                            {(book.warnings || []).map((warning) => (
                              <span key={warning} style={warningBadge}>
                                {humanize(warning)}
                              </span>
                            ))}
                          </div>
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

function SummaryCard({ label, value, tone = "neutral" }) {
  const toneMap = {
    neutral: "#111827",
    good: "#16a34a",
    warn: "#d97706",
    bad: "#dc2626",
  };

  return (
    <div style={cardStyle}>
      <div style={cardLabel}>{label}</div>
      <div
        style={{
          marginTop: "8px",
          color: toneMap[tone],
          fontSize: "25px",
          fontWeight: "750",
        }}
      >
        {value ?? 0}
      </div>
    </div>
  );
}

function ConditionPanel({ title, items, emptyText, tone }) {
  const isBad = tone === "bad";
  return (
    <div style={cardStyle}>
      <div style={tableHeaderRow}>
        <h2 style={sectionTitle}>{title}</h2>
        <span
          style={{
            ...countPill,
            color: isBad ? "#b91c1c" : "#b45309",
            backgroundColor: isBad ? "#fef2f2" : "#fffbeb",
          }}
        >
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div style={healthyBox}>{emptyText}</div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {items.map((item, index) => (
            <div
              key={`${item.code}-${index}`}
              style={{
                padding: "12px 13px",
                borderRadius: "8px",
                border: `1px solid ${isBad ? "#fecaca" : "#fde68a"}`,
                backgroundColor: isBad ? "#fef2f2" : "#fffbeb",
              }}
            >
              <div
                style={{
                  color: isBad ? "#b91c1c" : "#b45309",
                  fontSize: "12px",
                  fontWeight: "750",
                }}
              >
                {humanize(item.code)}
              </div>
              <div
                style={{
                  marginTop: "5px",
                  color: "#475569",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {item.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckRow({ label, value, neutral = false }) {
  const numericValue = Number(value || 0);
  return (
    <div style={checkRowStyle}>
      <span style={{ color: "#475569", fontSize: "13px" }}>
        {label}
      </span>
      <span
        style={{
          fontSize: "13px",
          fontWeight: "700",
          color: neutral
            ? "#334155"
            : numericValue > 0
            ? "#dc2626"
            : "#16a34a",
        }}
      >
        {numericValue}
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const theme = getStatusTheme(status);
  return (
    <span
      style={{
        padding: "8px 14px",
        borderRadius: "999px",
        backgroundColor: theme.badge,
        color: theme.color,
        fontSize: "12px",
        fontWeight: "800",
      }}
    >
      {status}
    </span>
  );
}

function getStatusTheme(status) {
  if (status === "CRITICAL") {
    return {
      color: "#dc2626",
      background: "#fff7f7",
      badge: "#fee2e2",
    };
  }

  if (status === "WARNING") {
    return {
      color: "#d97706",
      background: "#fffdf5",
      badge: "#fef3c7",
    };
  }

  return {
    color: "#16a34a",
    background: "#f7fef9",
    badge: "#dcfce7",
  };
}

function humanize(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value.endsWith?.("Z") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN");
}

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "24px",
};

const titleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "34px",
  fontWeight: "700",
};

const subtitleStyle = {
  margin: "7px 0 0",
  color: "#64748b",
  fontSize: "14px",
};

const cardStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "18px",
  boxShadow: "0 3px 10px rgba(15, 23, 42, 0.05)",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
  gap: "14px",
  marginBottom: "20px",
};

const twoColumnGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
  gap: "18px",
  marginTop: "20px",
};

const cardLabel = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "600",
};

const sectionLabel = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.7px",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
  fontWeight: "700",
};

const sectionSubtitle = {
  margin: "5px 0 16px",
  color: "#64748b",
  fontSize: "12px",
};

const statusRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "16px",
};

const refreshButton = {
  padding: "10px 16px",
  border: "none",
  borderRadius: "8px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "600",
};

const errorStyle = {
  marginBottom: "20px",
  padding: "12px 14px",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  backgroundColor: "#fef2f2",
  color: "#b91c1c",
  fontSize: "13px",
};

const tableHeaderRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "14px",
};

const countPill = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: "999px",
  backgroundColor: "#f1f5f9",
  color: "#475569",
  fontSize: "11px",
  fontWeight: "700",
};

const healthyBox = {
  padding: "13px",
  borderRadius: "8px",
  backgroundColor: "#ecfdf5",
  color: "#15803d",
  fontSize: "13px",
  fontWeight: "600",
};

const checkRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  padding: "11px 0",
  borderBottom: "1px solid #eef2f7",
};

const tableStyle = {
  width: "100%",
  minWidth: "850px",
  borderCollapse: "collapse",
  fontSize: "13px",
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

const emptyTableStyle = {
  padding: "28px",
  textAlign: "center",
  color: "#64748b",
};

const badgeWrap = {
  display: "flex",
  flexWrap: "wrap",
  gap: "5px",
};

const warningBadge = {
  display: "inline-block",
  padding: "4px 7px",
  borderRadius: "6px",
  backgroundColor: "#fff7ed",
  color: "#c2410c",
  fontSize: "10px",
  fontWeight: "700",
};

export default SystemHealth;
