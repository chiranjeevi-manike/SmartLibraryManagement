import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "https://smartlibrarymanagement-production.up.railway.app";

function CollectionDevelopmentMonitoring() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [months, setMonths] = useState(6);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

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
        `${API_BASE_URL}/analytics/collection-development-monitoring?recent_months=${months}&limit=20`,
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
        let message =
          "Unable to load collection development monitoring.";

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
        err.message ||
          "Unable to load collection development monitoring."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [months]);

  const summary = data?.summary || {};
  const acquisition = data?.acquisition_recommendations || [];
  const monitor = data?.monitor_recommendations || [];
  const underutilized = data?.underutilized_books || [];
  const collection = data?.collection || [];

  const filteredCollection = useMemo(() => {
    const term = search.trim().toLowerCase();

    return collection.filter((book) => {
      const matchesSearch =
        !term ||
        [book.book_id, book.title]
          .filter(
            (value) =>
              value !== null && value !== undefined
          )
          .some((value) =>
            String(value).toLowerCase().includes(term)
          );

      const matchesFilter =
        filter === "ALL" ||
        book.recommendation === filter ||
        book.demand_level === filter ||
        book.stock_status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [collection, search, filter]);

  return (
    <div>
      <div style={headerRow}>
        <div>
          <h1 style={titleStyle}>
            Book Acquisition & Collection Development
          </h1>
          <p style={subtitleStyle}>
            Identify high-demand titles, stock pressure,
            underutilized books, and evidence-based acquisition
            opportunities.
          </p>
        </div>

        <div style={headerActions}>
          <select
            value={months}
            onChange={(e) =>
              setMonths(Number(e.target.value))
            }
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
          Loading collection development monitoring...
        </div>
      ) : (
        <>
          <div style={summaryGrid}>
            <MetricCard
              label="Active Titles Analyzed"
              value={summary.active_titles_analyzed}
            />
            <MetricCard
              label="High-Demand Titles"
              value={summary.high_demand_titles}
              tone={
                Number(summary.high_demand_titles) > 0
                  ? "warn"
                  : "good"
              }
            />
            <MetricCard
              label="Low-Stock Titles"
              value={summary.low_stock_titles}
              tone={
                Number(summary.low_stock_titles) > 0
                  ? "warn"
                  : "good"
              }
            />
            <MetricCard
              label="Out of Stock"
              value={summary.out_of_stock_titles}
              tone={
                Number(summary.out_of_stock_titles) > 0
                  ? "bad"
                  : "good"
              }
            />
            <MetricCard
              label="Underutilized Titles"
              value={summary.underutilized_titles}
            />
            <MetricCard
              label="Titles Needing Copies"
              value={
                summary.titles_recommended_for_additional_copies
              }
              tone="good"
            />
            <MetricCard
              label="Recommended New Copies"
              value={
                summary.total_recommended_additional_copies
              }
              tone="good"
            />
          </div>

          <div style={twoColumnGrid}>
            <div style={cardStyle}>
              <div style={sectionHeaderRow}>
                <div>
                  <h2 style={sectionTitle}>
                    Acquisition Recommendations
                  </h2>
                  <p style={sectionSubtitle}>
                    High-demand titles where additional copies
                    are recommended.
                  </p>
                </div>
                <span style={countPill}>
                  {acquisition.length}
                </span>
              </div>

              <RecommendationList
                items={acquisition}
                emptyText="No titles currently require additional copies."
                acquisition
              />
            </div>

            <div style={cardStyle}>
              <div style={sectionHeaderRow}>
                <div>
                  <h2 style={sectionTitle}>
                    Demand Watchlist
                  </h2>
                  <p style={sectionSubtitle}>
                    Titles that should be monitored before making
                    an acquisition decision.
                  </p>
                </div>
                <span style={countPill}>
                  {monitor.length}
                </span>
              </div>

              <RecommendationList
                items={monitor}
                emptyText="No titles are currently on the demand watchlist."
              />
            </div>
          </div>

          <div style={{ ...cardStyle, marginTop: "20px" }}>
            <div style={sectionHeaderRow}>
              <div>
                <h2 style={sectionTitle}>
                  Collection Analysis
                </h2>
                <p style={sectionSubtitle}>
                  Compare stock, borrowing, reservations,
                  utilization, ratings, and acquisition status.
                </p>
              </div>

              <span style={countPill}>
                {filteredCollection.length} title(s)
              </span>
            </div>

            <div style={filterRow}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title or book ID..."
                style={searchInput}
              />

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={selectStyle}
              >
                <option value="ALL">All Titles</option>
                <option value="ADD_COPIES">
                  Add Copies
                </option>
                <option value="MONITOR_DEMAND">
                  Monitor Demand
                </option>
                <option value="REVIEW_UTILIZATION">
                  Review Utilization
                </option>
                <option value="HIGH">High Demand</option>
                <option value="MEDIUM">
                  Medium Demand
                </option>
                <option value="LOW">Low Demand</option>
                <option value="OUT_OF_STOCK">
                  Out of Stock
                </option>
                <option value="LOW_STOCK">
                  Low Stock
                </option>
              </select>
            </div>

            <div style={tableWrap}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    <th style={thStyle}>Book</th>
                    <th style={thStyle}>Stock</th>
                    <th style={thStyle}>Utilization</th>
                    <th style={thStyle}>Recent Borrows</th>
                    <th style={thStyle}>Reservations</th>
                    <th style={thStyle}>Demand</th>
                    <th style={thStyle}>Rating</th>
                    <th style={thStyle}>Recommendation</th>
                    <th style={thStyle}>Add Copies</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCollection.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        style={emptyTableStyle}
                      >
                        No collection records match the
                        selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCollection.map((book) => (
                      <tr key={book.book_id}>
                        <td style={tdStyle}>
                          <div style={primaryCell}>
                            {book.title}
                          </div>
                          <div style={smallMuted}>
                            Book ID {book.book_id} · Lifetime{" "}
                            {book.lifetime_borrows || 0} borrow(s)
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <StatusBadge
                            value={book.stock_status}
                          />
                          <div style={smallMuted}>
                            {book.available_copies}/
                            {book.total_copies} available
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <strong>
                            {number(
                              book.current_utilization_percentage
                            )}
                            %
                          </strong>
                          <MiniProgress
                            value={
                              book.current_utilization_percentage
                            }
                          />
                        </td>

                        <td style={tdStyle}>
                          {book.recent_borrows || 0}
                        </td>

                        <td style={tdStyle}>
                          <div>
                            Queue:{" "}
                            <strong>
                              {book.active_reservation_queue ||
                                0}
                            </strong>
                          </div>
                          <div style={smallMuted}>
                            Ready:{" "}
                            {book.ready_for_pickup || 0}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <DemandBadge
                            value={book.demand_level}
                          />
                          <div style={smallMuted}>
                            Score {book.demand_score || 0}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <div style={ratingText}>
                            ★{" "}
                            {number(book.average_rating)}
                          </div>
                          <div style={smallMuted}>
                            {book.rating_count || 0} rating(s)
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <RecommendationBadge
                            value={book.recommendation}
                          />
                          {book.recommendation_reasons?.length >
                            0 && (
                            <div style={reasonText}>
                              {book.recommendation_reasons
                                .map(formatLabel)
                                .join(", ")}
                            </div>
                          )}
                        </td>

                        <td style={tdStyle}>
                          <strong
                            style={{
                              color:
                                Number(
                                  book.recommended_additional_copies
                                ) > 0
                                  ? "#15803d"
                                  : "#64748b",
                            }}
                          >
                            {book.recommended_additional_copies ||
                              0}
                          </strong>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={twoColumnGrid}>
            <div style={cardStyle}>
              <h2 style={sectionTitle}>
                Underutilized Collection
              </h2>
              <p style={sectionSubtitle}>
                Active titles with no recorded borrowing or
                reservation demand.
              </p>

              {underutilized.length === 0 ? (
                <div style={emptyBox}>
                  No underutilized titles identified.
                </div>
              ) : (
                underutilized.map((book) => (
                  <div
                    key={book.book_id}
                    style={simpleBookRow}
                  >
                    <div>
                      <div style={primaryCell}>
                        {book.title}
                      </div>
                      <div style={smallMuted}>
                        {book.total_copies} total copies ·{" "}
                        {book.available_copies} available
                      </div>
                    </div>

                    <RecommendationBadge
                      value={book.recommendation}
                    />
                  </div>
                ))
              )}
            </div>

            <div style={cardStyle}>
              <h2 style={sectionTitle}>
                Collection Development Policy
              </h2>
              <p style={sectionSubtitle}>
                Thresholds currently used by the monitoring
                engine.
              </p>

              <PolicyRow
                label="Analysis period"
                value={`${data?.policy?.recent_months || months} months`}
              />
              <PolicyRow
                label="Low-stock threshold"
                value={`≤ ${
                  data?.policy
                    ?.low_stock_available_copies_threshold ??
                  2
                } available`}
              />
              <PolicyRow
                label="High-demand queue"
                value={`≥ ${
                  data?.policy
                    ?.high_demand_active_queue_threshold ??
                  3
                } waiting`}
              />
              <PolicyRow
                label="High recent circulation"
                value={`≥ ${
                  data?.policy
                    ?.high_recent_circulation_threshold ??
                  5
                } borrows`}
              />
              <PolicyRow
                label="High utilization"
                value={`≥ ${
                  data?.policy
                    ?.high_utilization_threshold_percentage ??
                  80
                }%`}
              />
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

function RecommendationList({
  items,
  emptyText,
  acquisition = false,
}) {
  if (!items.length) {
    return <div style={emptyBox}>{emptyText}</div>;
  }

  return (
    <div>
      {items.map((book) => (
        <div key={book.book_id} style={recommendationRow}>
          <div style={{ minWidth: 0 }}>
            <div style={primaryCell}>{book.title}</div>
            <div style={smallMuted}>
              Recent borrows {book.recent_borrows || 0} · Queue{" "}
              {book.active_reservation_queue || 0} · Available{" "}
              {book.available_copies || 0}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            {acquisition ? (
              <>
                <div style={copyRecommendation}>
                  +{book.recommended_additional_copies || 0}{" "}
                  copies
                </div>
                <div style={smallMuted}>
                  {formatLabel(book.demand_level)} demand
                </div>
              </>
            ) : (
              <RecommendationBadge
                value={book.recommendation}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ value }) {
  const styles = {
    IN_STOCK: {
      backgroundColor: "#dcfce7",
      color: "#15803d",
    },
    LOW_STOCK: {
      backgroundColor: "#fef3c7",
      color: "#b45309",
    },
    OUT_OF_STOCK: {
      backgroundColor: "#fee2e2",
      color: "#b91c1c",
    },
  };

  return (
    <span
      style={{
        ...badgeBase,
        ...(styles[value] || styles.IN_STOCK),
      }}
    >
      {formatLabel(value)}
    </span>
  );
}

function DemandBadge({ value }) {
  const styles = {
    HIGH: {
      backgroundColor: "#fee2e2",
      color: "#b91c1c",
    },
    MEDIUM: {
      backgroundColor: "#fef3c7",
      color: "#b45309",
    },
    LOW: {
      backgroundColor: "#e0f2fe",
      color: "#0369a1",
    },
  };

  return (
    <span
      style={{
        ...badgeBase,
        ...(styles[value] || styles.LOW),
      }}
    >
      {formatLabel(value)}
    </span>
  );
}

function RecommendationBadge({ value }) {
  const styles = {
    ADD_COPIES: {
      backgroundColor: "#dcfce7",
      color: "#15803d",
    },
    MONITOR_DEMAND: {
      backgroundColor: "#fef3c7",
      color: "#b45309",
    },
    REVIEW_UTILIZATION: {
      backgroundColor: "#e0e7ff",
      color: "#4338ca",
    },
    NO_ACTION: {
      backgroundColor: "#f1f5f9",
      color: "#475569",
    },
  };

  return (
    <span
      style={{
        ...badgeBase,
        ...(styles[value] || styles.NO_ACTION),
      }}
    >
      {formatLabel(value)}
    </span>
  );
}

function MiniProgress({ value }) {
  const safe = Math.max(
    0,
    Math.min(100, Number(value || 0))
  );

  return (
    <div style={miniTrack}>
      <div
        style={{
          width: `${safe}%`,
          height: "100%",
          borderRadius: "999px",
          backgroundColor:
            safe >= 80
              ? "#dc2626"
              : safe >= 50
                ? "#f59e0b"
                : "#2563eb",
        }}
      />
    </div>
  );
}

function PolicyRow({ label, value }) {
  return (
    <div style={policyRow}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <strong style={{ color: "#111827" }}>{value}</strong>
    </div>
  );
}

function number(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function formatLabel(value) {
  if (!value) return "—";

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

const sectionHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
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

const countPill = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: "999px",
  backgroundColor: "#f1f5f9",
  color: "#475569",
  fontSize: "11px",
  fontWeight: "700",
};

const filterRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginBottom: "14px",
};

const searchInput = {
  width: "100%",
  maxWidth: "340px",
  boxSizing: "border-box",
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
  minWidth: "1200px",
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

const recommendationRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  padding: "12px 0",
  borderBottom: "1px solid #eef2f7",
};

const copyRecommendation = {
  color: "#15803d",
  fontSize: "13px",
  fontWeight: "800",
  whiteSpace: "nowrap",
};

const badgeBase = {
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: "750",
  whiteSpace: "nowrap",
};

const ratingText = {
  color: "#b45309",
  fontSize: "12px",
  fontWeight: "700",
};

const reasonText = {
  maxWidth: "220px",
  marginTop: "5px",
  color: "#64748b",
  fontSize: "9px",
  lineHeight: "1.4",
};

const miniTrack = {
  width: "85px",
  height: "5px",
  marginTop: "6px",
  overflow: "hidden",
  borderRadius: "999px",
  backgroundColor: "#e5e7eb",
};

const simpleBookRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "12px 0",
  borderBottom: "1px solid #eef2f7",
};

const policyRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  padding: "12px 0",
  borderBottom: "1px solid #eef2f7",
  fontSize: "12px",
};

export default CollectionDevelopmentMonitoring;

