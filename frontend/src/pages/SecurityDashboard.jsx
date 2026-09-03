import { useEffect, useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

function SecurityDashboard() {
  const [data, setData] = useState({
    summary: {},
    locked_users: [],
    recent_security_events: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unlockingId, setUnlockingId] = useState(null);

  const token = localStorage.getItem("token");

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role_id");
    window.location.href = "/";
  };

  const fetchSecurityDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/analytics/security-dashboard?recent_limit=15`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || "Unable to load security dashboard."
        );
      }

      setData(result);
    } catch (err) {
      setError(err.message || "Unable to load security dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityDashboard();
  }, []);

  const unlockUser = async (user) => {
    const confirmed = window.confirm(
      `Unlock account "${user.username}"?`
    );

    if (!confirmed) return;

    try {
      setUnlockingId(user.id);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/users/${user.id}/unlock`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || "Unable to unlock account."
        );
      }

      await fetchSecurityDashboard();
    } catch (err) {
      setError(err.message || "Unable to unlock account.");
    } finally {
      setUnlockingId(null);
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";

    const normalized =
      typeof value === "string" && !value.endsWith("Z")
        ? `${value}Z`
        : value;

    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const getEventStyle = (action) => {
    if (
      action === "LOGIN_FAILED" ||
      action === "ACCOUNT_LOCKED"
    ) {
      return {
        backgroundColor: "#fee2e2",
        color: "#b91c1c",
      };
    }

    if (
      action === "LOGIN_SUCCESS" ||
      action === "ACCOUNT_UNLOCKED"
    ) {
      return {
        backgroundColor: "#dcfce7",
        color: "#15803d",
      };
    }

    return {
      backgroundColor: "#e2e8f0",
      color: "#475569",
    };
  };

  const summary = data.summary || {};
  const lockedUsers = data.locked_users || [];
  const recentEvents = data.recent_security_events || [];

  if (loading) {
    return (
      <div style={styles.messageCard}>
        Loading security dashboard...
      </div>
    );
  }

  return (
    <div>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Security Dashboard</h1>
          <p style={styles.subtitle}>
            Monitor authentication activity, account locks,
            unlocks, and recent security events.
          </p>
        </div>

        <button
          onClick={fetchSecurityDashboard}
          style={styles.refreshButton}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      <div style={styles.cardsGrid}>
        <SummaryCard
          title="Successful Logins"
          value={summary.login_success || 0}
          accent="#16a34a"
        />
        <SummaryCard
          title="Failed Logins"
          value={summary.login_failed || 0}
          accent="#dc2626"
        />
        <SummaryCard
          title="Account Locks"
          value={summary.account_locked || 0}
          accent="#f59e0b"
        />
        <SummaryCard
          title="Account Unlocks"
          value={summary.account_unlocked || 0}
          accent="#2563eb"
        />
        <SummaryCard
          title="Currently Locked"
          value={summary.currently_locked || 0}
          accent="#7c3aed"
        />
      </div>

      <section style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              Currently Locked Accounts
            </h2>
            <p style={styles.sectionSubtitle}>
              Accounts whose temporary lock period is still active.
            </p>
          </div>

          <span style={styles.countBadge}>
            {lockedUsers.length}
          </span>
        </div>

        {lockedUsers.length === 0 ? (
          <div style={styles.emptyState}>
            No accounts are currently locked.
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Failed Attempts</th>
                  <th style={styles.th}>Locked Until</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {lockedUsers.map((user) => (
                  <tr key={user.id}>
                    <td style={styles.td}>
                      <div style={styles.userName}>
                        {user.full_name || user.username}
                      </div>
                      <div style={styles.secondaryText}>
                        @{user.username}
                      </div>
                      <div style={styles.secondaryText}>
                        {user.email}
                      </div>
                    </td>

                    <td style={styles.td}>
                      {user.role || "—"}
                    </td>

                    <td style={styles.td}>
                      <span style={styles.attemptBadge}>
                        {user.failed_login_attempts || 0}
                      </span>
                    </td>

                    <td style={styles.td}>
                      {formatDate(user.locked_until)}
                    </td>

                    <td style={styles.td}>
                      <button
                        onClick={() => unlockUser(user)}
                        disabled={unlockingId === user.id}
                        style={{
                          ...styles.unlockButton,
                          opacity:
                            unlockingId === user.id ? 0.6 : 1,
                        }}
                      >
                        {unlockingId === user.id
                          ? "Unlocking..."
                          : "Unlock"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              Recent Security Events
            </h2>
            <p style={styles.sectionSubtitle}>
              Latest login, lock, and unlock audit activity.
            </p>
          </div>
        </div>

        {recentEvents.length === 0 ? (
          <div style={styles.emptyState}>
            No security events are available.
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Time</th>
                  <th style={styles.th}>Event</th>
                  <th style={styles.th}>User ID</th>
                  <th style={styles.th}>Details</th>
                </tr>
              </thead>

              <tbody>
                {recentEvents.map((event) => (
                  <tr key={event.id}>
                    <td style={styles.td}>
                      {formatDate(event.created_at)}
                    </td>

                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.eventBadge,
                          ...getEventStyle(event.action),
                        }}
                      >
                        {event.action}
                      </span>
                    </td>

                    <td style={styles.td}>
                      {event.user_id ?? "—"}
                    </td>

                    <td style={styles.td}>
                      {event.details || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ title, value, accent }) {
  return (
    <div
      style={{
        ...styles.summaryCard,
        borderTop: `4px solid ${accent}`,
      }}
    >
      <div style={styles.summaryTitle}>{title}</div>
      <div style={styles.summaryValue}>{value}</div>
    </div>
  );
}

const styles = {
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "24px",
  },
  title: {
    margin: 0,
    color: "#111827",
    fontSize: "34px",
    fontWeight: 700,
    letterSpacing: "-0.7px",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  refreshButton: {
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    padding: "10px 18px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  errorBox: {
    marginBottom: "20px",
    padding: "12px 14px",
    border: "1px solid #fecaca",
    borderRadius: "9px",
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    fontSize: "14px",
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "16px",
    marginBottom: "22px",
  },
  summaryCard: {
    minHeight: "100px",
    padding: "18px",
    boxSizing: "border-box",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
    boxShadow: "0 3px 12px rgba(15, 23, 42, 0.05)",
  },
  summaryTitle: {
    color: "#64748b",
    fontSize: "13px",
    fontWeight: 600,
  },
  summaryValue: {
    marginTop: "10px",
    color: "#111827",
    fontSize: "30px",
    fontWeight: 700,
  },
  sectionCard: {
    marginBottom: "22px",
    overflow: "hidden",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    backgroundColor: "#ffffff",
    boxShadow: "0 3px 12px rgba(15, 23, 42, 0.04)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    padding: "18px 20px",
    borderBottom: "1px solid #e5e7eb",
  },
  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "18px",
    fontWeight: 700,
  },
  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },
  countBadge: {
    minWidth: "30px",
    padding: "5px 9px",
    borderRadius: "999px",
    backgroundColor: "#eef2ff",
    color: "#4338ca",
    textAlign: "center",
    fontSize: "12px",
    fontWeight: 700,
  },
  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    minWidth: "760px",
    borderCollapse: "collapse",
  },
  th: {
    padding: "12px 16px",
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#f8fafc",
    color: "#475569",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "14px 16px",
    borderBottom: "1px solid #f1f5f9",
    color: "#334155",
    fontSize: "13px",
    verticalAlign: "middle",
  },
  userName: {
    color: "#111827",
    fontWeight: 600,
  },
  secondaryText: {
    marginTop: "3px",
    color: "#94a3b8",
    fontSize: "12px",
  },
  attemptBadge: {
    display: "inline-flex",
    minWidth: "26px",
    justifyContent: "center",
    padding: "4px 7px",
    borderRadius: "999px",
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    fontWeight: 700,
  },
  unlockButton: {
    border: "1px solid #2563eb",
    borderRadius: "7px",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    padding: "7px 12px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  eventBadge: {
    display: "inline-flex",
    padding: "5px 8px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  emptyState: {
    padding: "34px 20px",
    color: "#64748b",
    textAlign: "center",
    fontSize: "14px",
  },
  messageCard: {
    padding: "28px",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    backgroundColor: "#ffffff",
    color: "#64748b",
    fontSize: "14px",
  },
};

export default SecurityDashboard;
