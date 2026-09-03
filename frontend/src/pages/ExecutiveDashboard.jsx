import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

function ExecutiveDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");

  const loadDashboard = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/analytics/executive-dashboard`,
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
        let message = "Unable to load executive dashboard.";
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
        err.message || "Unable to load executive dashboard."
      );
    } finally {
      setLoading(false);
    }
  };


  const downloadExecutiveReport = async (format) => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    setExporting(format);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/reports/executive/${format}`,
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
        let message = `Unable to export ${format.toUpperCase()} report.`;

        try {
          const body = await response.json();
          message = body.detail || message;
        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const disposition =
        response.headers.get("content-disposition") || "";

      const filenameMatch = disposition.match(
        /filename="?([^"]+)"?/i
      );

      const fallbackName =
        format === "pdf"
          ? "smart_library_executive_report.pdf"
          : "smart_library_executive_report.xlsx";

      const filename =
        filenameMatch?.[1]?.trim() || fallbackName;

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err.message || "Unable to download executive report."
      );
    } finally {
      setExporting("");
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const summary = data?.executive_summary || {};
  const statusCounts = data?.status_counts || {};
  const kpis = data?.kpis || [];
  const priorities = data?.priority_actions || [];
  const health = data?.operational_health || {};

  if (loading) {
    return (
      <div>
        <h1 style={titleStyle}>Executive Dashboard</h1>
        <div style={cardStyle}>
          Loading library executive performance...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={headerRow}>
        <div>
          <h1 style={titleStyle}>
            Library KPI & Executive Performance
          </h1>
          <p style={subtitleStyle}>
            Management-level view of circulation, finance,
            inventory, member risk, collection demand, security,
            and operational health.
          </p>
        </div>

        <div style={headerActions}>
          <button
            onClick={() => downloadExecutiveReport("pdf")}
            style={pdfButton}
            disabled={Boolean(exporting)}
          >
            {exporting === "pdf" ? "Exporting..." : "Export PDF"}
          </button>

          <button
            onClick={() => downloadExecutiveReport("excel")}
            style={excelButton}
            disabled={Boolean(exporting)}
          >
            {exporting === "excel"
              ? "Exporting..."
              : "Export Excel"}
          </button>

          <button
            onClick={loadDashboard}
            style={refreshButton}
            disabled={Boolean(exporting)}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {data && (
        <>
          <OverallStatus
            status={data.overall_status}
            counts={statusCounts}
            generatedAt={data.generated_at}
          />

          <div style={summaryGrid}>
            <MetricCard
              label="Total Members"
              value={summary.total_members}
              detail={`${summary.eligible_members || 0} eligible`}
            />
            <MetricCard
              label="Active Titles"
              value={summary.active_titles}
              detail={`${summary.total_copies || 0} total copies`}
            />
            <MetricCard
              label="Currently Issued"
              value={summary.currently_issued}
              detail={`${summary.overdue_books || 0} overdue`}
              tone={
                Number(summary.overdue_books) > 0
                  ? "bad"
                  : "good"
              }
            />
            <MetricCard
              label="Return Rate"
              value={`${number(summary.return_rate_percentage)}%`}
              detail={`${summary.returned_issues || 0} returned`}
              tone="good"
            />
            <MetricCard
              label="Outstanding Fines"
              value={money(summary.outstanding_fines)}
              detail={`${number(
                summary.fine_collection_percentage
              )}% collected`}
              tone={
                Number(summary.outstanding_fines) > 0
                  ? "warn"
                  : "good"
              }
            />
            <MetricCard
              label="Active Reservations"
              value={summary.active_reservations}
              detail={`${summary.ready_for_pickup || 0} ready`}
            />
            <MetricCard
              label="High-Risk Members"
              value={summary.high_risk_members}
              detail={`${summary.blocked_members || 0} blocked`}
              tone={
                Number(summary.high_risk_members) > 0
                  ? "bad"
                  : "good"
              }
            />
            <MetricCard
              label="High-Demand Titles"
              value={summary.high_demand_titles}
              detail={`${summary.total_recommended_additional_copies || 0} copies suggested`}
              tone={
                Number(summary.high_demand_titles) > 0
                  ? "warn"
                  : "good"
              }
            />
          </div>

          <div style={twoColumnGrid}>
            <div style={cardStyle}>
              <SectionHeader
                title="Executive KPI Scorecard"
                subtitle="Performance status across the library's major management areas."
              />

              <div style={kpiGrid}>
                {kpis.map((kpi) => (
                  <KpiCard key={kpi.code} kpi={kpi} />
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <SectionHeader
                title="Management Priorities"
                subtitle="Actions requiring executive attention, ordered by priority."
              />

              {priorities.length === 0 ? (
                <EmptyState text="No management priorities identified." />
              ) : (
                priorities.map((item, index) => (
                  <PriorityRow
                    key={`${item.area}-${index}`}
                    item={item}
                  />
                ))
              )}
            </div>
          </div>

          <div style={threeColumnGrid}>
            <PerformancePanel
              title="Circulation Performance"
              rows={[
                [
                  "Total issue records",
                  summary.total_issues || 0,
                ],
                [
                  "Returned",
                  summary.returned_issues || 0,
                ],
                [
                  "Currently issued",
                  summary.currently_issued || 0,
                ],
                [
                  "Overdue books",
                  summary.overdue_books || 0,
                ],
                [
                  "Return rate",
                  `${number(
                    summary.return_rate_percentage
                  )}%`,
                ],
                [
                  "Overdue rate",
                  `${number(
                    summary.overdue_rate_percentage
                  )}%`,
                ],
              ]}
            />

            <PerformancePanel
              title="Financial Performance"
              rows={[
                [
                  "Fines generated",
                  money(summary.total_fines_generated),
                ],
                [
                  "Fines collected",
                  money(summary.total_fines_collected),
                ],
                [
                  "Outstanding",
                  money(summary.outstanding_fines),
                ],
                [
                  "Collection rate",
                  `${number(
                    summary.fine_collection_percentage
                  )}%`,
                ],
                [
                  "Unpaid fine cases",
                  health.unpaid_fine_cases || 0,
                ],
              ]}
            />

            <PerformancePanel
              title="Inventory & Collection"
              rows={[
                [
                  "Total copies",
                  summary.total_copies || 0,
                ],
                [
                  "Available copies",
                  summary.available_copies || 0,
                ],
                [
                  "Inventory utilization",
                  `${number(
                    summary.inventory_utilization_percentage
                  )}%`,
                ],
                [
                  "Low-stock titles",
                  summary.low_stock_titles || 0,
                ],
                [
                  "Out-of-stock titles",
                  summary.out_of_stock_titles || 0,
                ],
                [
                  "Titles needing copies",
                  summary
                    .titles_recommended_for_additional_copies ||
                    0,
                ],
              ]}
            />
          </div>

          <div style={twoColumnGrid}>
            <div style={cardStyle}>
              <SectionHeader
                title="Operational Health"
                subtitle="Current exceptions that may require administrative review."
              />

              <div style={healthGrid}>
                <HealthItem
                  label="Locked Accounts"
                  value={summary.currently_locked_accounts}
                />
                <HealthItem
                  label="Unread Notifications"
                  value={summary.unread_notifications}
                />
                <HealthItem
                  label="Expired READY Waiting"
                  value={health.expired_ready_waiting}
                />
                <HealthItem
                  label="Negative Stock Titles"
                  value={health.negative_stock_titles}
                />
                <HealthItem
                  label="Copy Count Mismatches"
                  value={health.copy_count_mismatches}
                />
                <HealthItem
                  label="Data Consistency Issues"
                  value={summary.data_consistency_issues}
                />
              </div>
            </div>

            <div style={cardStyle}>
              <SectionHeader
                title="Executive Performance Snapshot"
                subtitle="A compact interpretation of the current library position."
              />

              <SnapshotRow
                label="Member Eligibility"
                value={`${summary.eligible_members || 0} / ${
                  summary.total_members || 0
                }`}
                percentage={percent(
                  summary.eligible_members,
                  summary.total_members
                )}
              />

              <SnapshotRow
                label="Return Performance"
                value={`${number(
                  summary.return_rate_percentage
                )}%`}
                percentage={
                  summary.return_rate_percentage || 0
                }
              />

              <SnapshotRow
                label="Fine Collection"
                value={`${number(
                  summary.fine_collection_percentage
                )}%`}
                percentage={
                  summary.fine_collection_percentage || 0
                }
              />

              <SnapshotRow
                label="Inventory Utilization"
                value={`${number(
                  summary.inventory_utilization_percentage
                )}%`}
                percentage={
                  summary.inventory_utilization_percentage || 0
                }
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OverallStatus({ status, counts, generatedAt }) {
  const config = statusConfig(status);

  return (
    <div
      style={{
        ...overallCard,
        borderLeft: `5px solid ${config.color}`,
      }}
    >
      <div>
        <div style={eyebrow}>OVERALL EXECUTIVE STATUS</div>
        <div
          style={{
            marginTop: "5px",
            color: config.color,
            fontSize: "30px",
            fontWeight: "800",
          }}
        >
          {status || "—"}
        </div>
        <div style={smallMuted}>
          Last generated {formatDateTime(generatedAt)}
        </div>
      </div>

      <div style={statusSummary}>
        <StatusCount
          label="Good"
          value={counts.GOOD}
          color="#16a34a"
        />
        <StatusCount
          label="Attention"
          value={counts.ATTENTION}
          color="#d97706"
        />
        <StatusCount
          label="Critical"
          value={counts.CRITICAL}
          color="#dc2626"
        />
      </div>
    </div>
  );
}

function StatusCount({ label, value, color }) {
  return (
    <div style={statusCountBox}>
      <div
        style={{
          color,
          fontSize: "22px",
          fontWeight: "800",
        }}
      >
        {value || 0}
      </div>
      <div style={smallMuted}>{label}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}) {
  const colors = {
    neutral: "#111827",
    good: "#16a34a",
    warn: "#d97706",
    bad: "#dc2626",
  };

  return (
    <div style={cardStyle}>
      <div style={metricLabel}>{label}</div>
      <div
        style={{
          marginTop: "7px",
          color: colors[tone],
          fontSize: "23px",
          fontWeight: "800",
        }}
      >
        {value ?? 0}
      </div>
      <div style={smallMuted}>{detail}</div>
    </div>
  );
}

function KpiCard({ kpi }) {
  const config = statusConfig(kpi.status);

  return (
    <div style={kpiCard}>
      <div style={kpiHeader}>
        <span style={kpiLabel}>{kpi.label}</span>
        <span
          style={{
            ...statusBadge,
            backgroundColor: config.background,
            color: config.color,
          }}
        >
          {kpi.status}
        </span>
      </div>

      <div style={kpiValue}>
        {formatKpiValue(kpi)}
      </div>

      <div style={kpiMessage}>{kpi.message}</div>
    </div>
  );
}

function PriorityRow({ item }) {
  const config = priorityConfig(item.priority);

  return (
    <div style={priorityRow}>
      <div
        style={{
          ...priorityIndicator,
          backgroundColor: config.color,
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={priorityHeader}>
          <span style={priorityArea}>
            {formatLabel(item.area)}
          </span>
          <span
            style={{
              ...priorityBadge,
              backgroundColor: config.background,
              color: config.color,
            }}
          >
            {item.priority}
          </span>
        </div>
        <div style={priorityMessage}>
          {item.message}
        </div>
      </div>
    </div>
  );
}

function PerformancePanel({ title, rows }) {
  return (
    <div style={cardStyle}>
      <h2 style={sectionTitle}>{title}</h2>
      <div style={{ marginTop: "12px" }}>
        {rows.map(([label, value]) => (
          <div key={label} style={dataRow}>
            <span style={dataLabel}>{label}</span>
            <strong style={dataValue}>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthItem({ label, value }) {
  const numeric = Number(value || 0);
  const healthy = numeric === 0;

  return (
    <div style={healthItem}>
      <div style={metricLabel}>{label}</div>
      <div
        style={{
          marginTop: "6px",
          color: healthy ? "#16a34a" : "#dc2626",
          fontSize: "21px",
          fontWeight: "800",
        }}
      >
        {numeric}
      </div>
      <div style={smallMuted}>
        {healthy ? "No current exception" : "Review required"}
      </div>
    </div>
  );
}

function SnapshotRow({
  label,
  value,
  percentage,
}) {
  const safe = Math.max(
    0,
    Math.min(100, Number(percentage || 0))
  );

  return (
    <div style={snapshotBlock}>
      <div style={snapshotHeader}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <div style={progressTrack}>
        <div
          style={{
            width: `${safe}%`,
            height: "100%",
            borderRadius: "999px",
            backgroundColor:
              safe >= 80
                ? "#16a34a"
                : safe >= 60
                  ? "#f59e0b"
                  : "#dc2626",
          }}
        />
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div>
      <h2 style={sectionTitle}>{title}</h2>
      <p style={sectionSubtitle}>{subtitle}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return <div style={emptyState}>{text}</div>;
}

function statusConfig(status) {
  if (status === "GOOD") {
    return {
      color: "#15803d",
      background: "#dcfce7",
    };
  }

  if (status === "ATTENTION") {
    return {
      color: "#b45309",
      background: "#fef3c7",
    };
  }

  return {
    color: "#b91c1c",
    background: "#fee2e2",
  };
}

function priorityConfig(priority) {
  if (priority === "HIGH") {
    return {
      color: "#dc2626",
      background: "#fee2e2",
    };
  }

  if (priority === "MEDIUM") {
    return {
      color: "#d97706",
      background: "#fef3c7",
    };
  }

  return {
    color: "#2563eb",
    background: "#dbeafe",
  };
}

function formatKpiValue(kpi) {
  if (kpi.unit === "PERCENT") {
    return `${number(kpi.value)}%`;
  }

  return `${number(kpi.value)} ${formatLabel(
    kpi.unit
  ).toLowerCase()}`;
}

function number(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function percent(part, total) {
  const p = Number(part || 0);
  const t = Number(total || 0);
  return t > 0 ? (p / t) * 100 : 0;
}

function formatLabel(value) {
  if (!value) return "—";

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDateTime(value) {
  if (!value) return "—";

  const raw = String(value);
  const hasZone =
    /Z$/i.test(raw) ||
    /[+-]\d{2}:\d{2}$/.test(raw);

  const date = new Date(hasZone ? raw : `${raw}Z`);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleString("en-IN");
}

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

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: "16px",
  marginBottom: "22px",
};

const headerActions = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  flexWrap: "wrap",
};

const exportButtonBase = {
  padding: "10px 16px",
  border: "none",
  borderRadius: "8px",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "600",
};

const pdfButton = {
  ...exportButtonBase,
  backgroundColor: "#dc2626",
};

const excelButton = {
  ...exportButtonBase,
  backgroundColor: "#15803d",
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

const overallCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "18px",
  padding: "20px 22px",
  marginBottom: "18px",
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  boxShadow: "0 3px 10px rgba(15, 23, 42, 0.05)",
};

const eyebrow = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.8px",
};

const statusSummary = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const statusCountBox = {
  minWidth: "85px",
  padding: "10px 14px",
  textAlign: "center",
  backgroundColor: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "9px",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(175px, 1fr))",
  gap: "14px",
};

const twoColumnGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(400px, 1fr))",
  gap: "18px",
  marginTop: "20px",
};

const threeColumnGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(280px, 1fr))",
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

const metricLabel = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "650",
};

const smallMuted = {
  marginTop: "4px",
  color: "#64748b",
  fontSize: "10px",
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

const kpiGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "10px",
};

const kpiCard = {
  padding: "13px",
  border: "1px solid #e5e7eb",
  borderRadius: "9px",
  backgroundColor: "#f8fafc",
};

const kpiHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
};

const kpiLabel = {
  color: "#334155",
  fontSize: "11px",
  fontWeight: "700",
};

const statusBadge = {
  padding: "3px 7px",
  borderRadius: "999px",
  fontSize: "9px",
  fontWeight: "800",
};

const kpiValue = {
  marginTop: "9px",
  color: "#111827",
  fontSize: "18px",
  fontWeight: "800",
};

const kpiMessage = {
  marginTop: "5px",
  color: "#64748b",
  fontSize: "9px",
  lineHeight: "1.4",
};

const priorityRow = {
  display: "flex",
  gap: "11px",
  padding: "12px 0",
  borderBottom: "1px solid #eef2f7",
};

const priorityIndicator = {
  width: "4px",
  minWidth: "4px",
  borderRadius: "999px",
};

const priorityHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
};

const priorityArea = {
  color: "#111827",
  fontSize: "11px",
  fontWeight: "750",
};

const priorityBadge = {
  padding: "3px 7px",
  borderRadius: "999px",
  fontSize: "9px",
  fontWeight: "800",
};

const priorityMessage = {
  marginTop: "5px",
  color: "#475569",
  fontSize: "11px",
  lineHeight: "1.45",
};

const dataRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  padding: "9px 0",
  borderBottom: "1px solid #eef2f7",
  fontSize: "11px",
};

const dataLabel = {
  color: "#64748b",
};

const dataValue = {
  color: "#111827",
};

const healthGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(145px, 1fr))",
  gap: "10px",
};

const healthItem = {
  padding: "12px",
  border: "1px solid #e5e7eb",
  borderRadius: "9px",
  backgroundColor: "#f8fafc",
};

const snapshotBlock = {
  marginBottom: "17px",
};

const snapshotHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "7px",
  color: "#334155",
  fontSize: "11px",
};

const progressTrack = {
  height: "7px",
  overflow: "hidden",
  borderRadius: "999px",
  backgroundColor: "#e5e7eb",
};

const emptyState = {
  padding: "22px",
  textAlign: "center",
  borderRadius: "8px",
  backgroundColor: "#f8fafc",
  color: "#64748b",
  fontSize: "12px",
};

export default ExecutiveDashboard;
