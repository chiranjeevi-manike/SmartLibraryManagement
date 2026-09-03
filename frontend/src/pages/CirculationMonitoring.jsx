import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

function CirculationMonitoring() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [months, setMonths] = useState(6);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/analytics/circulation-monitoring?months=${months}&limit=10`,
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
        let message = "Unable to load circulation monitoring.";

        try {
          const body = await response.json();
          message = body.detail || message;
        } catch {
          // Keep the default message.
        }

        throw new Error(message);
      }

      setData(await response.json());
    } catch (err) {
      setError(
        err.message || "Unable to load circulation monitoring."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [months]);

  const summary = data?.summary || {};
  const topBooks = data?.top_circulated_books || [];
  const activeMembers = data?.most_active_members || [];
  const trends = data?.monthly_trends || [];

  const filteredBooks = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return topBooks;

    return topBooks.filter((book) =>
      [book.book_id, book.title]
        .filter((value) => value !== null && value !== undefined)
        .some((value) =>
          String(value).toLowerCase().includes(term)
        )
    );
  }, [topBooks, search]);

  const maxTrend = Math.max(
    1,
    ...trends.flatMap((item) => [
      Number(item.issues || 0),
      Number(item.returns || 0),
      Number(item.renewals || 0),
    ])
  );

  return (
    <div>
      <div style={headerRow}>
        <div>
          <h1 style={titleStyle}>
            Borrowing & Circulation Performance
          </h1>
          <p style={subtitleStyle}>
            Monitor borrowing volume, returns, renewals, overdue
            performance, member activity, and circulation trends.
          </p>
        </div>

        <div style={headerActions}>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            style={selectStyle}
          >
            <option value={3}>Last 3 Months</option>
            <option value={6}>Last 6 Months</option>
            <option value={12}>Last 12 Months</option>
            <option value={24}>Last 24 Months</option>
          </select>

          <button onClick={loadData} style={refreshButton}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {loading ? (
        <div style={cardStyle}>
          Loading circulation monitoring...
        </div>
      ) : (
        <>
          <div style={summaryGrid}>
            <MetricCard
              label="Total Issues"
              value={summary.total_issues}
            />
            <MetricCard
              label="Returned Issues"
              value={summary.returned_issues}
              tone="good"
            />
            <MetricCard
              label="Currently Issued"
              value={summary.currently_issued}
            />
            <MetricCard
              label="Currently Overdue"
              value={summary.currently_overdue}
              tone={
                Number(summary.currently_overdue) > 0
                  ? "bad"
                  : "good"
              }
            />
            <MetricCard
              label="Return Rate"
              value={`${number(
                summary.return_rate_percentage
              )}%`}
              tone="good"
            />
            <MetricCard
              label="Overdue Rate"
              value={`${number(
                summary.overdue_rate_percentage
              )}%`}
              tone={
                Number(summary.overdue_rate_percentage) > 0
                  ? "warn"
                  : "good"
              }
            />
            <MetricCard
              label="Renewed Issue Records"
              value={summary.renewed_issue_records}
            />
            <MetricCard
              label="Total Renewals"
              value={summary.total_renewals}
            />
            <MetricCard
              label="Renewal Usage"
              value={`${number(
                summary.renewal_usage_rate_percentage
              )}%`}
            />
            <MetricCard
              label="Avg. Borrowing Duration"
              value={`${number(
                summary.average_completed_borrowing_days
              )} days`}
            />
          </div>

          <div style={performanceGrid}>
            <div style={cardStyle}>
              <h2 style={sectionTitle}>
                Circulation Performance
              </h2>
              <p style={sectionSubtitle}>
                Key circulation rates across all borrowing records.
              </p>

              <ProgressBar
                label="Return Rate"
                value={summary.return_rate_percentage}
                good
              />
              <ProgressBar
                label="Overdue Rate"
                value={summary.overdue_rate_percentage}
                warning
              />
              <ProgressBar
                label="Renewal Usage Rate"
                value={summary.renewal_usage_rate_percentage}
              />
            </div>

            <div style={cardStyle}>
              <h2 style={sectionTitle}>
                Current Circulation Snapshot
              </h2>
              <p style={sectionSubtitle}>
                Live borrowing workload and completed circulation.
              </p>

              <SnapshotRow
                label="All-time issue records"
                value={summary.total_issues}
              />
              <SnapshotRow
                label="Completed returns"
                value={summary.returned_issues}
                good
              />
              <SnapshotRow
                label="Books currently out"
                value={summary.currently_issued}
              />
              <SnapshotRow
                label="Currently overdue"
                value={summary.currently_overdue}
                bad={Number(summary.currently_overdue) > 0}
              />
              <SnapshotRow
                label="Average completed loan"
                value={`${number(
                  summary.average_completed_borrowing_days
                )} days`}
              />
            </div>
          </div>

          <div style={{ ...cardStyle, marginTop: "20px" }}>
            <div style={sectionHeaderRow}>
              <div>
                <h2 style={sectionTitle}>
                  Monthly Circulation Trends
                </h2>
                <p style={sectionSubtitle}>
                  Issue, return, and renewal activity over time.
                </p>
              </div>

              <span style={countPill}>
                {trends.length} month(s)
              </span>
            </div>

            {trends.length === 0 ? (
              <div style={emptyBox}>
                No monthly circulation data available.
              </div>
            ) : (
              <div style={trendGrid}>
                {trends.map((item) => (
                  <div key={item.month} style={trendCard}>
                    <div style={trendMonth}>
                      {formatMonth(item.month)}
                    </div>

                    <TrendBar
                      label="Issues"
                      value={item.issues}
                      max={maxTrend}
                    />
                    <TrendBar
                      label="Returns"
                      value={item.returns}
                      max={maxTrend}
                      good
                    />
                    <TrendBar
                      label="Renewals"
                      value={item.renewals}
                      max={maxTrend}
                      warning
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={twoColumnGrid}>
            <div style={cardStyle}>
              <div style={sectionHeaderRow}>
                <div>
                  <h2 style={sectionTitle}>
                    Most Circulated Books
                  </h2>
                  <p style={sectionSubtitle}>
                    Titles ranked by total borrowing transactions.
                  </p>
                </div>

                <span style={countPill}>
                  {filteredBooks.length}
                </span>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search book title or ID..."
                style={searchInput}
              />

              <div style={tableWrap}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={theadRow}>
                      <th style={thStyle}>Book</th>
                      <th style={thStyle}>Issues</th>
                      <th style={thStyle}>Returns</th>
                      <th style={thStyle}>Out</th>
                      <th style={thStyle}>Renewals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          style={emptyTableStyle}
                        >
                          No circulated books found.
                        </td>
                      </tr>
                    ) : (
                      filteredBooks.map((book, index) => (
                        <tr key={book.book_id}>
                          <td style={tdStyle}>
                            <div style={rankCell}>
                              <span style={rankNumber}>
                                {index + 1}
                              </span>
                              <div>
                                <div style={primaryCell}>
                                  {book.title}
                                </div>
                                <div style={smallMuted}>
                                  Book ID {book.book_id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <strong>{book.issue_count}</strong>
                          </td>
                          <td style={tdStyle}>
                            {book.return_count}
                          </td>
                          <td style={tdStyle}>
                            {book.currently_issued}
                          </td>
                          <td style={tdStyle}>
                            {book.renewal_count}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={sectionHeaderRow}>
                <div>
                  <h2 style={sectionTitle}>
                    Most Active Members
                  </h2>
                  <p style={sectionSubtitle}>
                    Members ranked by borrowing activity.
                  </p>
                </div>

                <span style={countPill}>
                  {activeMembers.length}
                </span>
              </div>

              <div style={tableWrap}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={theadRow}>
                      <th style={thStyle}>Member</th>
                      <th style={thStyle}>Issues</th>
                      <th style={thStyle}>Returns</th>
                      <th style={thStyle}>Out</th>
                      <th style={thStyle}>Renewals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeMembers.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          style={emptyTableStyle}
                        >
                          No member circulation activity.
                        </td>
                      </tr>
                    ) : (
                      activeMembers.map((member, index) => (
                        <tr key={member.user_id}>
                          <td style={tdStyle}>
                            <div style={rankCell}>
                              <span style={memberRank}>
                                {index + 1}
                              </span>
                              <div>
                                <div style={primaryCell}>
                                  {member.full_name ||
                                    member.username}
                                </div>
                                <div style={smallMuted}>
                                  @{member.username}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <strong>{member.issue_count}</strong>
                          </td>
                          <td style={tdStyle}>
                            {member.return_count}
                          </td>
                          <td style={tdStyle}>
                            {member.currently_issued}
                          </td>
                          <td style={tdStyle}>
                            {member.renewal_count}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, tone = "neutral" }) {
  const colors = {
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
          color: colors[tone] || colors.neutral,
          fontSize: "24px",
          fontWeight: "800",
        }}
      >
        {value ?? 0}
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  good = false,
  warning = false,
}) {
  const safeValue = Math.max(
    0,
    Math.min(100, Number(value || 0))
  );

  let barColor = "#2563eb";
  if (good) barColor = "#16a34a";
  if (warning) barColor = "#f59e0b";

  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={progressLabelRow}>
        <span>{label}</span>
        <strong>{number(safeValue)}%</strong>
      </div>

      <div style={progressTrack}>
        <div
          style={{
            width: `${safeValue}%`,
            height: "100%",
            borderRadius: "999px",
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}

function SnapshotRow({
  label,
  value,
  good = false,
  bad = false,
}) {
  let color = "#111827";
  if (good) color = "#15803d";
  if (bad) color = "#b91c1c";

  return (
    <div style={snapshotRow}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <strong style={{ color }}>{value ?? 0}</strong>
    </div>
  );
}

function TrendBar({
  label,
  value,
  max,
  good = false,
  warning = false,
}) {
  const width = Math.max(
    2,
    (Number(value || 0) / max) * 100
  );

  let barColor = "#2563eb";
  if (good) barColor = "#16a34a";
  if (warning) barColor = "#f59e0b";

  return (
    <div style={{ marginTop: "10px" }}>
      <div style={trendLabelRow}>
        <span>{label}</span>
        <strong>{number(value)}</strong>
      </div>

      <div style={miniTrack}>
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            borderRadius: "999px",
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}

function number(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function formatMonth(value) {
  if (!value) return "—";

  const [year, month] = value.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString(
    "en-IN",
    {
      month: "short",
      year: "numeric",
    }
  );
}

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: "16px",
  marginBottom: "24px",
};

const headerActions = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
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

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
  gap: "14px",
};

const performanceGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
  gap: "18px",
  marginTop: "20px",
};

const twoColumnGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(430px, 1fr))",
  gap: "18px",
  marginTop: "20px",
};

const cardStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "18px",
  boxShadow: "0 3px 10px rgba(15, 23, 42, 0.05)",
};

const cardLabel = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "600",
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

const sectionHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
};

const selectStyle = {
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  backgroundColor: "#ffffff",
  color: "#334155",
  fontSize: "13px",
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

const progressLabelRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "7px",
  color: "#475569",
  fontSize: "12px",
};

const progressTrack = {
  height: "9px",
  overflow: "hidden",
  borderRadius: "999px",
  backgroundColor: "#e5e7eb",
};

const snapshotRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "12px 0",
  borderBottom: "1px solid #eef2f7",
  fontSize: "13px",
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

const trendGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "12px",
};

const trendCard = {
  padding: "13px",
  border: "1px solid #e5e7eb",
  borderRadius: "9px",
  backgroundColor: "#f8fafc",
};

const trendMonth = {
  color: "#111827",
  fontSize: "13px",
  fontWeight: "750",
};

const trendLabelRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  color: "#64748b",
  fontSize: "10px",
};

const miniTrack = {
  height: "6px",
  marginTop: "5px",
  borderRadius: "999px",
  overflow: "hidden",
  backgroundColor: "#e5e7eb",
};

const searchInput = {
  width: "100%",
  maxWidth: "340px",
  boxSizing: "border-box",
  marginBottom: "12px",
  padding: "9px 11px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  outline: "none",
  fontSize: "12px",
};

const tableWrap = {
  overflowX: "auto",
};

const tableStyle = {
  width: "100%",
  minWidth: "650px",
  borderCollapse: "collapse",
  fontSize: "12px",
};

const theadRow = {
  backgroundColor: "#f8fafc",
};

const thStyle = {
  padding: "10px 11px",
  textAlign: "left",
  borderBottom: "1px solid #e5e7eb",
  color: "#475569",
  fontWeight: "700",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "11px",
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

const emptyBox = {
  padding: "20px",
  borderRadius: "8px",
  backgroundColor: "#f8fafc",
  color: "#64748b",
  textAlign: "center",
  fontSize: "12px",
};

const rankCell = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
};

const rankNumber = {
  width: "28px",
  height: "28px",
  minWidth: "28px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  backgroundColor: "#dbeafe",
  color: "#1d4ed8",
  fontSize: "10px",
  fontWeight: "800",
};

const memberRank = {
  ...rankNumber,
  backgroundColor: "#dcfce7",
  color: "#15803d",
};

const primaryCell = {
  color: "#111827",
  fontSize: "12px",
  fontWeight: "650",
};

const smallMuted = {
  marginTop: "3px",
  color: "#64748b",
  fontSize: "10px",
};

export default CirculationMonitoring;
