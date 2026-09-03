import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

function ReservationDemandMonitoring() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [demandFilter, setDemandFilter] = useState("ALL");
  const [expandedBookId, setExpandedBookId] = useState(null);

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
        `${API_BASE_URL}/analytics/reservation-demand-monitoring`,
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
        let message = "Unable to load reservation demand monitoring.";

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
        err.message || "Unable to load reservation demand monitoring."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const summary = data?.summary || {};
  const books = data?.books || [];
  const expiringSoon = data?.ready_expiring_soon || [];
  const policy = data?.policy || {};

  const filteredBooks = useMemo(() => {
    const term = search.trim().toLowerCase();

    return books.filter((book) => {
      const matchesSearch =
        !term ||
        String(book.book_id).includes(term) ||
        String(book.title || "").toLowerCase().includes(term);

      const matchesDemand =
        demandFilter === "ALL" ||
        book.demand_level === demandFilter;

      return matchesSearch && matchesDemand;
    });
  }, [books, search, demandFilter]);

  return (
    <div>
      <div style={headerRow}>
        <div>
          <h1 style={titleStyle}>
            Reservation Queue & Demand Monitoring
          </h1>
          <p style={subtitleStyle}>
            Monitor FIFO waiting queues, pickup deadlines, and
            book-level reservation demand.
          </p>
        </div>

        <button onClick={loadData} style={refreshButton}>
          Refresh
        </button>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {loading ? (
        <div style={cardStyle}>Loading reservation demand...</div>
      ) : (
        <>
          <div style={summaryGrid}>
            <SummaryCard
              label="Total Reservations"
              value={summary.total_reservations}
            />
            <SummaryCard
              label="Active Waiting"
              value={summary.active_reservations}
              tone={summary.active_reservations > 0 ? "warn" : "good"}
            />
            <SummaryCard
              label="Ready for Pickup"
              value={summary.ready_for_pickup}
              tone="good"
            />
            <SummaryCard
              label="Fulfilled"
              value={summary.fulfilled_reservations}
              tone="good"
            />
            <SummaryCard
              label="Expired"
              value={summary.expired_reservations}
              tone={summary.expired_reservations > 0 ? "bad" : "neutral"}
            />
            <SummaryCard
              label="Cancelled"
              value={summary.cancelled_reservations}
            />
            <SummaryCard
              label="Books with Demand"
              value={summary.books_with_current_demand}
            />
            <SummaryCard
              label="High-Demand Books"
              value={summary.high_demand_books}
              tone={summary.high_demand_books > 0 ? "bad" : "good"}
            />
            <SummaryCard
              label="Longest Queue"
              value={summary.longest_active_queue}
              tone={summary.longest_active_queue >= 3 ? "bad" : "neutral"}
            />
            <SummaryCard
              label="Pickup Expiring ≤24h"
              value={summary.ready_expiring_within_24_hours}
              tone={
                summary.ready_expiring_within_24_hours > 0
                  ? "warn"
                  : "good"
              }
            />
            <SummaryCard
              label="Past Pickup Deadline"
              value={summary.ready_past_pickup_deadline}
              tone={
                summary.ready_past_pickup_deadline > 0
                  ? "bad"
                  : "good"
              }
            />
          </div>

          <div style={twoColumnGrid}>
            <HighlightCard
              title="Longest Active Queue"
              emptyText="No active waiting queue."
              item={data?.longest_queue_book}
            >
              {(item) => (
                <>
                  <div style={highlightValue}>
                    {item.active_queue} waiting
                  </div>
                  <div style={highlightText}>
                    {item.title} · Book ID {item.book_id}
                  </div>
                </>
              )}
            </HighlightCard>

            <HighlightCard
              title="Oldest Waiting Reservation"
              emptyText="No member is currently waiting."
              item={data?.oldest_waiting_reservation}
            >
              {(item) => (
                <>
                  <div style={highlightValue}>
                    {Number(item.waiting_days || 0).toFixed(2)} days
                  </div>
                  <div style={highlightText}>
                    {item.full_name || item.username} · {item.book_title}
                  </div>
                  <div style={smallMuted}>
                    Reserved {formatDateTime(item.reserved_at)}
                  </div>
                </>
              )}
            </HighlightCard>
          </div>

          <div style={{ ...cardStyle, marginTop: "20px" }}>
            <div style={tableHeaderRow}>
              <div>
                <h2 style={sectionTitle}>
                  READY Pickups Expiring Within 24 Hours
                </h2>
                <p style={sectionSubtitle}>
                  Reservations requiring prompt pickup attention.
                </p>
              </div>
              <span style={countPill}>{expiringSoon.length}</span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    {[
                      "Reservation",
                      "Member",
                      "Book",
                      "Pickup Deadline",
                      "Hours Remaining",
                    ].map((heading) => (
                      <th key={heading} style={thStyle}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expiringSoon.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={emptyTableStyle}>
                        No READY pickup is expiring within 24 hours.
                      </td>
                    </tr>
                  ) : (
                    expiringSoon.map((item) => (
                      <tr key={item.reservation_id}>
                        <td style={tdStyle}>#{item.reservation_id}</td>
                        <td style={tdStyle}>
                          <div style={primaryCell}>
                            {item.full_name || item.username}
                          </div>
                          <div style={smallMuted}>{item.email}</div>
                        </td>
                        <td style={tdStyle}>
                          <div style={primaryCell}>{item.book_title}</div>
                          <div style={smallMuted}>
                            Book ID {item.book_id}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          {formatDateTime(item.ready_until)}
                        </td>
                        <td style={tdStyle}>
                          <span style={warningBadge}>
                            {Number(item.hours_remaining || 0).toFixed(2)} h
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...cardStyle, marginTop: "20px" }}>
            <div style={tableHeaderRow}>
              <div>
                <h2 style={sectionTitle}>Book Demand & FIFO Queues</h2>
                <p style={sectionSubtitle}>
                  Current ACTIVE waiting queues and READY pickups by title.
                </p>
              </div>

              <span style={countPill}>
                {filteredBooks.length} book(s)
              </span>
            </div>

            <div style={filterRow}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or book ID..."
                style={inputStyle}
              />

              <select
                value={demandFilter}
                onChange={(e) => setDemandFilter(e.target.value)}
                style={selectStyle}
              >
                <option value="ALL">All Demand Levels</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    {[
                      "Book",
                      "Copies",
                      "Active Queue",
                      "Ready",
                      "Total Demand",
                      "Demand",
                      "Next Member",
                      "Details",
                    ].map((heading) => (
                      <th key={heading} style={thStyle}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredBooks.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={emptyTableStyle}>
                        No books match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredBooks.map((book) => (
                      <BookRows
                        key={book.book_id}
                        book={book}
                        expanded={expandedBookId === book.book_id}
                        onToggle={() =>
                          setExpandedBookId(
                            expandedBookId === book.book_id
                              ? null
                              : book.book_id
                          )
                        }
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...cardStyle, marginTop: "20px" }}>
            <h2 style={sectionTitle}>Queue Policy</h2>
            <p style={sectionSubtitle}>
              Rules reflected by this monitoring view.
            </p>

            <div style={policyGrid}>
              <PolicyItem
                label="Queue Order"
                value={humanize(policy.queue_order)}
              />
              <PolicyItem
                label="Pickup Alert Window"
                value={`${policy.ready_expiring_soon_window_hours ?? 24} hours`}
              />
              <PolicyItem
                label="High Demand Threshold"
                value={`${policy.high_demand_active_queue_threshold ?? 3} active reservations`}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BookRows({ book, expanded, onToggle }) {
  const nextMember = book.next_waiting_member;

  return (
    <>
      <tr>
        <td style={tdStyle}>
          <div style={primaryCell}>{book.title}</div>
          <div style={smallMuted}>
            ID {book.book_id} · {book.is_active ? "Active" : "Inactive"}
          </div>
        </td>

        <td style={tdStyle}>
          {book.available_copies}/{book.total_copies} available
        </td>

        <td style={tdStyle}>{book.active_queue}</td>
        <td style={tdStyle}>{book.ready_for_pickup}</td>

        <td style={tdStyle}>
          <strong>{book.total_current_demand}</strong>
        </td>

        <td style={tdStyle}>
          <DemandBadge level={book.demand_level} />
        </td>

        <td style={{ ...tdStyle, minWidth: "180px" }}>
          {nextMember ? (
            <>
              <div style={primaryCell}>
                #{nextMember.queue_position}{" "}
                {nextMember.full_name || nextMember.username}
              </div>
              <div style={smallMuted}>
                Waiting {Number(nextMember.waiting_days || 0).toFixed(2)} days
              </div>
            </>
          ) : (
            <span style={smallMuted}>No active waiting member</span>
          )}
        </td>

        <td style={tdStyle}>
          <button onClick={onToggle} style={detailsButton}>
            {expanded ? "Hide" : "View Queue"}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan="8" style={expandedCell}>
            <div style={expandedGrid}>
              <QueuePanel
                title="ACTIVE FIFO Queue"
                items={book.queue || []}
              />
              <ReadyPanel
                title="READY Pickups"
                items={book.ready_pickups || []}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function QueuePanel({ title, items }) {
  return (
    <div style={innerPanel}>
      <h3 style={innerTitle}>{title}</h3>

      {items.length === 0 ? (
        <div style={emptyInner}>No active waiting reservations.</div>
      ) : (
        items.map((item) => (
          <div key={item.reservation_id} style={queueItem}>
            <div style={queuePosition}>#{item.queue_position}</div>
            <div style={{ flex: 1 }}>
              <div style={primaryCell}>
                {item.full_name || item.username}
              </div>
              <div style={smallMuted}>
                Reservation #{item.reservation_id} ·{" "}
                {formatDateTime(item.reserved_at)}
              </div>
            </div>
            <div style={waitBadge}>
              {Number(item.waiting_days || 0).toFixed(2)} days
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ReadyPanel({ title, items }) {
  return (
    <div style={innerPanel}>
      <h3 style={innerTitle}>{title}</h3>

      {items.length === 0 ? (
        <div style={emptyInner}>No READY pickups for this title.</div>
      ) : (
        items.map((item) => (
          <div key={item.reservation_id} style={queueItem}>
            <div style={{ flex: 1 }}>
              <div style={primaryCell}>
                {item.full_name || item.username}
              </div>
              <div style={smallMuted}>
                Reservation #{item.reservation_id} · Deadline{" "}
                {formatDateTime(item.ready_until)}
              </div>
            </div>
            <PickupBadge status={item.pickup_status} />
          </div>
        ))
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone = "neutral" }) {
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
          color: colors[tone],
          fontSize: "25px",
          fontWeight: "750",
        }}
      >
        {value ?? 0}
      </div>
    </div>
  );
}

function HighlightCard({
  title,
  item,
  emptyText,
  children,
}) {
  return (
    <div style={cardStyle}>
      <h2 style={sectionTitle}>{title}</h2>
      <div style={{ marginTop: "16px" }}>
        {item ? children(item) : <div style={healthyBox}>{emptyText}</div>}
      </div>
    </div>
  );
}

function DemandBadge({ level }) {
  const themes = {
    HIGH: {
      background: "#fee2e2",
      color: "#b91c1c",
    },
    MEDIUM: {
      background: "#fef3c7",
      color: "#b45309",
    },
    LOW: {
      background: "#dcfce7",
      color: "#15803d",
    },
  };

  const theme = themes[level] || {
    background: "#f1f5f9",
    color: "#475569",
  };

  return (
    <span
      style={{
        ...badgeBase,
        backgroundColor: theme.background,
        color: theme.color,
      }}
    >
      {level || "UNKNOWN"}
    </span>
  );
}

function PickupBadge({ status }) {
  let background = "#dcfce7";
  let color = "#15803d";

  if (status === "EXPIRING_SOON") {
    background = "#fef3c7";
    color = "#b45309";
  } else if (status === "PICKUP_DEADLINE_PASSED") {
    background = "#fee2e2";
    color = "#b91c1c";
  }

  return (
    <span
      style={{
        ...badgeBase,
        backgroundColor: background,
        color,
      }}
    >
      {humanize(status)}
    </span>
  );
}

function PolicyItem({ label, value }) {
  return (
    <div style={policyItem}>
      <div style={cardLabel}>{label}</div>
      <div
        style={{
          marginTop: "6px",
          color: "#111827",
          fontSize: "13px",
          fontWeight: "700",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function humanize(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(
    value.endsWith?.("Z") ? value : `${value}Z`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

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

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
  gap: "14px",
};

const twoColumnGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: "18px",
  marginTop: "20px",
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

const highlightValue = {
  color: "#2563eb",
  fontSize: "27px",
  fontWeight: "800",
};

const highlightText = {
  marginTop: "6px",
  color: "#334155",
  fontSize: "14px",
  fontWeight: "600",
};

const smallMuted = {
  marginTop: "3px",
  color: "#64748b",
  fontSize: "11px",
};

const primaryCell = {
  color: "#111827",
  fontSize: "13px",
  fontWeight: "600",
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

const tableStyle = {
  width: "100%",
  minWidth: "920px",
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

const warningBadge = {
  display: "inline-block",
  padding: "5px 8px",
  borderRadius: "6px",
  backgroundColor: "#fef3c7",
  color: "#b45309",
  fontSize: "11px",
  fontWeight: "700",
};

const badgeBase = {
  display: "inline-block",
  padding: "5px 8px",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: "800",
  whiteSpace: "nowrap",
};

const filterRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginBottom: "16px",
};

const inputStyle = {
  minWidth: "260px",
  flex: "1 1 280px",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  outline: "none",
  fontSize: "13px",
};

const selectStyle = {
  minWidth: "180px",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  backgroundColor: "#ffffff",
  fontSize: "13px",
};

const detailsButton = {
  padding: "7px 10px",
  border: "1px solid #bfdbfe",
  borderRadius: "7px",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: "700",
};

const expandedCell = {
  padding: "14px",
  backgroundColor: "#f8fafc",
  borderBottom: "1px solid #e5e7eb",
};

const expandedGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
  gap: "14px",
};

const innerPanel = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "9px",
  padding: "14px",
};

const innerTitle = {
  margin: "0 0 12px",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "750",
};

const queueItem = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 0",
  borderBottom: "1px solid #eef2f7",
};

const queuePosition = {
  width: "32px",
  height: "32px",
  minWidth: "32px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  fontSize: "11px",
  fontWeight: "800",
};

const waitBadge = {
  padding: "5px 7px",
  borderRadius: "6px",
  backgroundColor: "#f1f5f9",
  color: "#475569",
  fontSize: "10px",
  fontWeight: "700",
};

const emptyInner = {
  padding: "12px",
  borderRadius: "7px",
  backgroundColor: "#f8fafc",
  color: "#64748b",
  fontSize: "12px",
};

const healthyBox = {
  padding: "13px",
  borderRadius: "8px",
  backgroundColor: "#ecfdf5",
  color: "#15803d",
  fontSize: "13px",
  fontWeight: "600",
};

const policyGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "12px",
};

const policyItem = {
  padding: "13px",
  borderRadius: "9px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#f8fafc",
};

export default ReservationDemandMonitoring;
