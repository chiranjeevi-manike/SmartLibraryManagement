import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "https://smartlibrarymanagement-production.up.railway.app";

function FineMonitoring() {
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
        `${API_BASE_URL}/analytics/fine-monitoring?months=${months}&recent_limit=15`,
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
        let message = "Unable to load fine monitoring.";

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
      setError(err.message || "Unable to load fine monitoring.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [months]);

  const summary = data?.summary || {};
  const highestUnpaid = data?.highest_unpaid_members || [];
  const recentPayments = data?.recent_payments || [];
  const overdueExposure = data?.current_overdue_exposure || [];
  const monthlyTrends = data?.monthly_trends || [];
  const policy = data?.policy || {};

  const filteredExposure = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return overdueExposure;

    return overdueExposure.filter((item) =>
      [
        item.issue_id,
        item.user_id,
        item.username,
        item.full_name,
        item.email,
        item.book_id,
        item.book_title,
      ]
        .filter((value) => value !== null && value !== undefined)
        .some((value) =>
          String(value).toLowerCase().includes(term)
        )
    );
  }, [overdueExposure, search]);

  const maxTrendValue = Math.max(
    1,
    ...monthlyTrends.flatMap((item) => [
      Number(item.generated_amount || 0),
      Number(item.collected_amount || 0),
    ])
  );

  return (
    <div>
      <div style={headerRow}>
        <div>
          <h1 style={titleStyle}>
            Fine Collection & Revenue Monitoring
          </h1>
          <p style={subtitleStyle}>
            Track fine generation, recovery, outstanding balances,
            payment activity, and overdue financial exposure.
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
        <div style={cardStyle}>Loading fine monitoring...</div>
      ) : (
        <>
          <div style={summaryGrid}>
            <MoneyCard
              label="Fines Generated"
              value={summary.total_fines_generated}
            />
            <MoneyCard
              label="Collected"
              value={summary.total_collected}
              tone="good"
            />
            <MoneyCard
              label="Outstanding"
              value={summary.total_outstanding}
              tone={
                Number(summary.total_outstanding) > 0
                  ? "bad"
                  : "good"
              }
            />
            <MetricCard
              label="Collection Rate"
              value={`${number(summary.collection_percentage)}%`}
              tone={
                Number(summary.collection_percentage) >= 80
                  ? "good"
                  : "warn"
              }
            />
            <MetricCard
              label="Fine Cases"
              value={summary.total_fine_cases}
            />
            <MetricCard
              label="Paid Cases"
              value={summary.paid_cases}
              tone="good"
            />
            <MetricCard
              label="Unpaid Cases"
              value={summary.unpaid_cases}
              tone={
                Number(summary.unpaid_cases) > 0
                  ? "bad"
                  : "good"
              }
            />
            <MetricCard
              label="Outstanding Share"
              value={`${number(summary.outstanding_percentage)}%`}
              tone={
                Number(summary.outstanding_percentage) > 20
                  ? "bad"
                  : "neutral"
              }
            />
            <MetricCard
              label="Currently Overdue"
              value={summary.currently_overdue_issues}
              tone={
                Number(summary.currently_overdue_issues) > 0
                  ? "warn"
                  : "good"
              }
            />
            <MoneyCard
              label="Estimated Overdue Exposure"
              value={summary.estimated_current_overdue_exposure}
              tone={
                Number(summary.estimated_current_overdue_exposure) > 0
                  ? "warn"
                  : "good"
              }
            />
          </div>

          <div style={twoColumnGrid}>
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Collection Performance</h2>
              <p style={sectionSubtitle}>
                Share of generated fines already recovered.
              </p>

              <ProgressBar
                label="Collected"
                value={summary.collection_percentage}
                amount={summary.total_collected}
              />

              <ProgressBar
                label="Outstanding"
                value={summary.outstanding_percentage}
                amount={summary.total_outstanding}
                warning
              />

              <div style={policyBox}>
                Fine policy: ₹{number(policy.fine_per_overdue_day || 5)}
                {" "}per overdue day
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={sectionTitle}>
                Highest Outstanding Members
              </h2>
              <p style={sectionSubtitle}>
                Members with the largest unpaid fine balances.
              </p>

              {highestUnpaid.length === 0 ? (
                <div style={healthyBox}>
                  No member currently has an unpaid fine.
                </div>
              ) : (
                <div>
                  {highestUnpaid.map((item, index) => (
                    <div key={item.user_id} style={rankRow}>
                      <div style={rankNumber}>{index + 1}</div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={primaryCell}>
                          {item.full_name || item.username}
                        </div>
                        <div style={smallMuted}>
                          @{item.username} · {item.unpaid_cases} case(s)
                        </div>
                      </div>

                      <div style={moneyDanger}>
                        {money(item.outstanding_amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ ...cardStyle, marginTop: "20px" }}>
            <div style={sectionHeaderRow}>
              <div>
                <h2 style={sectionTitle}>
                  Monthly Fine Trends
                </h2>
                <p style={sectionSubtitle}>
                  Generated and collected fine amounts by month.
                </p>
              </div>

              <span style={countPill}>
                {monthlyTrends.length} month(s)
              </span>
            </div>

            {monthlyTrends.length === 0 ? (
              <div style={emptyBox}>No monthly trend data.</div>
            ) : (
              <div style={trendGrid}>
                {monthlyTrends.map((item) => (
                  <div key={item.month} style={trendCard}>
                    <div style={trendMonth}>
                      {formatMonth(item.month)}
                    </div>

                    <TrendBar
                      label="Generated"
                      amount={item.generated_amount}
                      max={maxTrendValue}
                    />

                    <TrendBar
                      label="Collected"
                      amount={item.collected_amount}
                      max={maxTrendValue}
                      collected
                    />

                    <div style={trendCases}>
                      {item.generated_cases} generated case(s) ·{" "}
                      {item.payment_cases} payment(s)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={twoColumnGrid}>
            <div style={cardStyle}>
              <div style={sectionHeaderRow}>
                <div>
                  <h2 style={sectionTitle}>Recent Fine Payments</h2>
                  <p style={sectionSubtitle}>
                    Latest completed fine payment transactions.
                  </p>
                </div>
                <span style={countPill}>{recentPayments.length}</span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={theadRow}>
                      <th style={thStyle}>Member</th>
                      <th style={thStyle}>Book</th>
                      <th style={thStyle}>Amount</th>
                      <th style={thStyle}>Paid At</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentPayments.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={emptyTableStyle}>
                          No fine payments recorded.
                        </td>
                      </tr>
                    ) : (
                      recentPayments.map((item) => (
                        <tr key={item.issue_id}>
                          <td style={tdStyle}>
                            <div style={primaryCell}>
                              {item.full_name || item.username}
                            </div>
                            <div style={smallMuted}>
                              @{item.username}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <div style={primaryCell}>
                              {item.book_title}
                            </div>
                            <div style={smallMuted}>
                              Issue #{item.issue_id}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <span style={paidBadge}>
                              {money(item.amount)}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            {formatDateTime(item.paid_at)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={sectionTitle}>Financial Snapshot</h2>
              <p style={sectionSubtitle}>
                Current recovery and exposure position.
              </p>

              <SnapshotRow
                label="Generated"
                value={money(summary.total_fines_generated)}
              />
              <SnapshotRow
                label="Recovered"
                value={money(summary.total_collected)}
                good
              />
              <SnapshotRow
                label="Outstanding"
                value={money(summary.total_outstanding)}
                bad
              />
              <SnapshotRow
                label="Potential Current Overdue"
                value={money(
                  summary.estimated_current_overdue_exposure
                )}
                warning
              />
              <SnapshotRow
                label="Recovery Rate"
                value={`${number(summary.collection_percentage)}%`}
                good
              />
            </div>
          </div>

          <div style={{ ...cardStyle, marginTop: "20px" }}>
            <div style={sectionHeaderRow}>
              <div>
                <h2 style={sectionTitle}>
                  Current Overdue Fine Exposure
                </h2>
                <p style={sectionSubtitle}>
                  Active overdue loans and estimated ₹5/day exposure.
                </p>
              </div>

              <span style={countPill}>
                {filteredExposure.length} record(s)
              </span>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member, book, issue ID..."
              style={searchInput}
            />

            <div style={{ overflowX: "auto", marginTop: "14px" }}>
              <table style={wideTableStyle}>
                <thead>
                  <tr style={theadRow}>
                    {[
                      "Issue",
                      "Member",
                      "Book",
                      "Due Date",
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
                  {filteredExposure.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={emptyTableStyle}>
                        No current overdue exposure matches the search.
                      </td>
                    </tr>
                  ) : (
                    filteredExposure.map((item) => (
                      <tr key={item.issue_id}>
                        <td style={tdStyle}>#{item.issue_id}</td>
                        <td style={tdStyle}>
                          <div style={primaryCell}>
                            {item.full_name || item.username}
                          </div>
                          <div style={smallMuted}>{item.email}</div>
                        </td>
                        <td style={tdStyle}>
                          <div style={primaryCell}>
                            {item.book_title}
                          </div>
                          <div style={smallMuted}>
                            Book ID {item.book_id}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          {formatDateTime(item.due_date)}
                        </td>
                        <td style={tdStyle}>
                          <span style={overdueBadge}>
                            {item.overdue_days} day(s)
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {money(item.estimated_fine)}
                        </td>
                        <td style={tdStyle}>
                          {money(item.recorded_fine)}
                        </td>
                        <td style={tdStyle}>
                          <FineStatusBadge
                            status={item.fine_status}
                          />
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

function MoneyCard({ label, value, tone = "neutral" }) {
  return (
    <MetricCard
      label={label}
      value={money(value)}
      tone={tone}
    />
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

function ProgressBar({ label, value, amount, warning = false }) {
  const safeValue = Math.max(
    0,
    Math.min(100, Number(value || 0))
  );

  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={progressLabelRow}>
        <span>{label}</span>
        <strong>
          {number(safeValue)}% · {money(amount)}
        </strong>
      </div>

      <div style={progressTrack}>
        <div
          style={{
            height: "100%",
            width: `${safeValue}%`,
            borderRadius: "999px",
            backgroundColor: warning ? "#f59e0b" : "#16a34a",
          }}
        />
      </div>
    </div>
  );
}

function TrendBar({ label, amount, max, collected = false }) {
  const width = Math.max(
    2,
    (Number(amount || 0) / max) * 100
  );

  return (
    <div style={{ marginTop: "10px" }}>
      <div style={trendLabelRow}>
        <span>{label}</span>
        <strong>{money(amount)}</strong>
      </div>

      <div style={miniTrack}>
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            borderRadius: "999px",
            backgroundColor: collected ? "#16a34a" : "#2563eb",
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
  warning = false,
}) {
  let color = "#111827";

  if (good) color = "#15803d";
  if (bad) color = "#b91c1c";
  if (warning) color = "#b45309";

  return (
    <div style={snapshotRow}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <strong style={{ color }}>{value}</strong>
    </div>
  );
}

function FineStatusBadge({ status }) {
  const paid = status === "PAID";

  return (
    <span
      style={{
        ...badgeBase,
        backgroundColor: paid ? "#dcfce7" : "#fee2e2",
        color: paid ? "#15803d" : "#b91c1c",
      }}
    >
      {status || "UNPAID"}
    </span>
  );
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(
    value.endsWith?.("Z") ? value : `${value}Z`
  );

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN");
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

const twoColumnGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(390px, 1fr))",
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
  alignItems: "center",
  justifyContent: "space-between",
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

const policyBox = {
  marginTop: "8px",
  padding: "11px 12px",
  borderRadius: "8px",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  fontSize: "12px",
  fontWeight: "650",
};

const healthyBox = {
  padding: "13px",
  borderRadius: "8px",
  backgroundColor: "#ecfdf5",
  color: "#15803d",
  fontSize: "13px",
  fontWeight: "600",
};

const rankRow = {
  display: "flex",
  alignItems: "center",
  gap: "11px",
  padding: "11px 0",
  borderBottom: "1px solid #eef2f7",
};

const rankNumber = {
  width: "30px",
  height: "30px",
  minWidth: "30px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  fontSize: "11px",
  fontWeight: "800",
};

const primaryCell = {
  color: "#111827",
  fontSize: "13px",
  fontWeight: "600",
};

const smallMuted = {
  marginTop: "3px",
  color: "#64748b",
  fontSize: "11px",
};

const moneyDanger = {
  color: "#dc2626",
  fontSize: "13px",
  fontWeight: "800",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
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

const trendCases = {
  marginTop: "10px",
  color: "#64748b",
  fontSize: "10px",
};

const tableStyle = {
  width: "100%",
  minWidth: "650px",
  borderCollapse: "collapse",
  fontSize: "13px",
};

const wideTableStyle = {
  width: "100%",
  minWidth: "1100px",
  borderCollapse: "collapse",
  fontSize: "13px",
};

const theadRow = {
  backgroundColor: "#f8fafc",
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

const emptyBox = {
  padding: "20px",
  borderRadius: "8px",
  backgroundColor: "#f8fafc",
  color: "#64748b",
  textAlign: "center",
  fontSize: "12px",
};

const paidBadge = {
  display: "inline-block",
  padding: "5px 8px",
  borderRadius: "6px",
  backgroundColor: "#dcfce7",
  color: "#15803d",
  fontSize: "11px",
  fontWeight: "800",
};

const overdueBadge = {
  display: "inline-block",
  padding: "5px 8px",
  borderRadius: "6px",
  backgroundColor: "#fef3c7",
  color: "#b45309",
  fontSize: "11px",
  fontWeight: "750",
};

const badgeBase = {
  display: "inline-block",
  padding: "5px 8px",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: "800",
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

const searchInput = {
  width: "100%",
  maxWidth: "420px",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  outline: "none",
  fontSize: "13px",
};

export default FineMonitoring;

