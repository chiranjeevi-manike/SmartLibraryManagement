import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "https://smartlibrarymanagement-production.up.railway.app";

function MemberRiskMonitoring() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [eligibilityFilter, setEligibilityFilter] =
    useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMemberRisk = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/analytics/member-risk-monitoring`,
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
          "Unable to load member risk monitoring data.";

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
          "Unable to load member risk monitoring data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberRisk();
  }, []);

  const summary = data?.summary || {};
  const policy = data?.policy || {};
  const members = data?.members || [];

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return members.filter((member) => {
      const searchMatches =
        !term ||
        String(member.user_id).includes(term) ||
        (member.username || "").toLowerCase().includes(term) ||
        (member.full_name || "").toLowerCase().includes(term) ||
        (member.email || "").toLowerCase().includes(term);

      const eligibilityMatches =
        eligibilityFilter === "ALL" ||
        member.borrowing_eligibility === eligibilityFilter;

      const riskMatches =
        riskFilter === "ALL" ||
        member.risk_level === riskFilter;

      return (
        searchMatches &&
        eligibilityMatches &&
        riskMatches
      );
    });
  }, [
    members,
    search,
    eligibilityFilter,
    riskFilter,
  ]);

  const cardStyle = {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "18px",
    boxShadow: "0 3px 10px rgba(15, 23, 42, 0.05)",
  };

  const summaryCard = (
    label,
    value,
    accent = "#111827"
  ) => (
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

  const eligibilityStyle = (status) => {
    if (status === "ELIGIBLE") {
      return {
        backgroundColor: "#ecfdf5",
        color: "#15803d",
      };
    }

    return {
      backgroundColor: "#fef2f2",
      color: "#b91c1c",
    };
  };

  const riskStyle = (risk) => {
    const styles = {
      LOW: {
        backgroundColor: "#ecfdf5",
        color: "#15803d",
      },
      MEDIUM: {
        backgroundColor: "#fffbeb",
        color: "#b45309",
      },
      HIGH: {
        backgroundColor: "#fef2f2",
        color: "#b91c1c",
      },
    };

    return styles[risk] || styles.LOW;
  };

  const reasonLabel = (reason) => {
    const labels = {
      INACTIVE_ACCOUNT: "Inactive Account",
      OVERDUE_BOOK: "Overdue Book",
      UNPAID_FINE: "Unpaid Fine",
      BORROWING_LIMIT_REACHED:
        "Borrowing Limit Reached",
    };

    return labels[reason] || reason;
  };

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
            Member Borrowing Risk & Eligibility
          </h1>

          <p
            style={{
              margin: "7px 0 0",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Monitor borrowing eligibility, overdue risk,
            unpaid fines, and borrowing capacity.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMemberRisk}
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
          Loading member risk information...
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(175px, 1fr))",
              gap: "14px",
              marginBottom: "20px",
            }}
          >
            {summaryCard(
              "Total Members",
              summary.total_members
            )}
            {summaryCard(
              "Eligible Members",
              summary.eligible_members,
              "#16a34a"
            )}
            {summaryCard(
              "Blocked Members",
              summary.blocked_members,
              "#dc2626"
            )}
            {summaryCard(
              "Overdue Cases",
              summary.members_with_overdue_books,
              "#dc2626"
            )}
            {summaryCard(
              "Members with Unpaid Fines",
              summary.members_with_unpaid_fines,
              "#f59e0b"
            )}
            {summaryCard(
              "At Borrowing Limit",
              summary.members_at_borrowing_limit,
              "#f59e0b"
            )}
            {summaryCard(
              "Inactive Members",
              summary.inactive_members,
              "#64748b"
            )}
            {summaryCard(
              "High-Risk Members",
              summary.high_risk_members,
              "#dc2626"
            )}
          </div>

          <div
            style={{
              ...cardStyle,
              marginBottom: "20px",
              padding: "14px 18px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px 24px",
                color: "#475569",
                fontSize: "13px",
              }}
            >
              <strong style={{ color: "#111827" }}>
                Borrowing Policy
              </strong>

              <span>
                Maximum active books:{" "}
                <strong>
                  {policy.borrowing_limit ?? 3}
                </strong>
              </span>

              <span>
                Overdue books:{" "}
                <strong>
                  {policy.blocks_on_overdue
                    ? "Blocking"
                    : "Not Blocking"}
                </strong>
              </span>

              <span>
                Unpaid fines:{" "}
                <strong>
                  {policy.blocks_on_unpaid_fine
                    ? "Blocking"
                    : "Not Blocking"}
                </strong>
              </span>

              <span>
                Inactive account:{" "}
                <strong>
                  {policy.blocks_on_inactive_account
                    ? "Blocking"
                    : "Not Blocking"}
                </strong>
              </span>
            </div>
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
                  Member Eligibility Details
                </h2>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  High-risk and blocked members are shown
                  first by the backend.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search member"
                  style={controlStyle}
                />

                <select
                  value={eligibilityFilter}
                  onChange={(e) =>
                    setEligibilityFilter(e.target.value)
                  }
                  style={controlStyle}
                >
                  <option value="ALL">
                    All Eligibility
                  </option>
                  <option value="ELIGIBLE">
                    Eligible
                  </option>
                  <option value="BLOCKED">
                    Blocked
                  </option>
                </select>

                <select
                  value={riskFilter}
                  onChange={(e) =>
                    setRiskFilter(e.target.value)
                  }
                  style={controlStyle}
                >
                  <option value="ALL">
                    All Risk Levels
                  </option>
                  <option value="HIGH">High Risk</option>
                  <option value="MEDIUM">
                    Medium Risk
                  </option>
                  <option value="LOW">Low Risk</option>
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
              Showing {filteredMembers.length} of{" "}
              {members.length} members
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: "1450px",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    {[
                      "ID",
                      "Member",
                      "Email",
                      "Account",
                      "Active Books",
                      "Remaining",
                      "Overdue",
                      "Unpaid Fines",
                      "Reservations",
                      "Eligibility",
                      "Risk",
                      "Blocking Reasons",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={thStyle}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td
                        colSpan="12"
                        style={{
                          padding: "28px",
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        No members match the selected
                        filters.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <tr key={member.user_id}>
                        <td style={tdStyle}>
                          {member.user_id}
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            minWidth: "190px",
                          }}
                        >
                          <div
                            style={{
                              color: "#111827",
                              fontWeight: "600",
                            }}
                          >
                            {member.full_name ||
                              member.username}
                          </div>
                          <div
                            style={{
                              marginTop: "3px",
                              color: "#64748b",
                              fontSize: "11px",
                            }}
                          >
                            @{member.username}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          {member.email}
                        </td>

                        <td style={tdStyle}>
                          <Badge
                            text={
                              member.is_active
                                ? "ACTIVE"
                                : "INACTIVE"
                            }
                            style={
                              member.is_active
                                ? {
                                    backgroundColor:
                                      "#ecfdf5",
                                    color: "#15803d",
                                  }
                                : {
                                    backgroundColor:
                                      "#f1f5f9",
                                    color: "#64748b",
                                  }
                            }
                          />
                        </td>

                        <td style={tdStyle}>
                          {member.active_books} /{" "}
                          {member.borrowing_limit}
                        </td>

                        <td style={tdStyle}>
                          {member.remaining_capacity}
                        </td>

                        <td style={tdStyle}>
                          <strong
                            style={{
                              color:
                                member.overdue_books > 0
                                  ? "#dc2626"
                                  : "#475569",
                            }}
                          >
                            {member.overdue_books}
                          </strong>
                        </td>

                        <td style={tdStyle}>
                          <strong
                            style={{
                              color:
                                Number(
                                  member.unpaid_fines
                                ) > 0
                                  ? "#b45309"
                                  : "#475569",
                            }}
                          >
                            {formatINR(
                              member.unpaid_fines
                            )}
                          </strong>
                        </td>

                        <td style={tdStyle}>
                          {member.active_reservations}
                        </td>

                        <td style={tdStyle}>
                          <Badge
                            text={
                              member.borrowing_eligibility
                            }
                            style={eligibilityStyle(
                              member.borrowing_eligibility
                            )}
                          />
                        </td>

                        <td style={tdStyle}>
                          <Badge
                            text={member.risk_level}
                            style={riskStyle(
                              member.risk_level
                            )}
                          />
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            minWidth: "240px",
                            whiteSpace: "normal",
                          }}
                        >
                          {member.blocking_reasons
                            ?.length ? (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "5px",
                              }}
                            >
                              {member.blocking_reasons.map(
                                (reason) => (
                                  <span
                                    key={reason}
                                    style={{
                                      display:
                                        "inline-block",
                                      padding: "4px 7px",
                                      borderRadius: "6px",
                                      backgroundColor:
                                        "#fef2f2",
                                      color: "#b91c1c",
                                      fontSize: "10px",
                                      fontWeight: "700",
                                    }}
                                  >
                                    {reasonLabel(reason)}
                                  </span>
                                )
                              )}
                            </div>
                          ) : (
                            <span
                              style={{
                                color: "#16a34a",
                                fontWeight: "600",
                              }}
                            >
                              None
                            </span>
                          )}
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

function Badge({ text, style }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 9px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: "700",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {text}
    </span>
  );
}

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

const controlStyle = {
  minWidth: "155px",
  padding: "9px 11px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  backgroundColor: "#ffffff",
  color: "#334155",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
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

export default MemberRiskMonitoring;

