import {
  useCallback,
  useEffect,
  useState,
} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

const ACTIONS = [
  "BOOK_CREATED",
  "BOOK_UPDATED",
  "BOOK_DEACTIVATED",
  "BOOK_ISSUED",
  "BOOK_RETURNED",
  "BOOK_RENEWED",
  "FINE_PAID",
  "RESERVATION_CREATED",
  "RESERVATION_CANCELLED",
  "RESERVATION_FULFILLED",
  "PROFILE_UPDATED",
  "PASSWORD_CHANGED",
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "ACCOUNT_LOCKED",
  "ACCOUNT_UNLOCKED",
];

const ENTITY_TYPES = [
  "BOOK",
  "ISSUE",
  "RESERVATION",
  "USER",
];

function AuditLogs() {
  const navigate = useNavigate();

  // ==================================================
  // CURRENT USER
  // ==================================================

  let storedUser = {};

  try {
    storedUser = JSON.parse(
      localStorage.getItem("user") || "{}"
    );
  } catch {
    storedUser = {};
  }

  const roleId = Number(storedUser.role_id);
  const isAdmin = roleId === 2;

  // ==================================================
  // STATE
  // ==================================================

  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);

  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(20);

  const [action, setAction] = useState("");
  const [entityType, setEntityType] =
    useState("");
  const [userId, setUserId] = useState("");
  const [entityId, setEntityId] =
    useState("");
  const [startDate, setStartDate] =
    useState("");
  const [endDate, setEndDate] =
    useState("");

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState({
    action: "",
    entityType: "",
    userId: "",
    entityId: "",
    startDate: "",
    endDate: "",
  });

  const [selectedLog, setSelectedLog] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    detailsLoading,
    setDetailsLoading,
  ] = useState(false);

  const [error, setError] = useState("");

  // ==================================================
  // AUTH
  // ==================================================

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem(
      "token"
    )}`,
  });

  const handleAuthError = useCallback(
    (err) => {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role_id");

        navigate("/");
        return true;
      }

      if (err.response?.status === 403) {
        setError(
          "Admin access is required."
        );
        return true;
      }

      return false;
    },
    [navigate]
  );

  // ==================================================
  // FETCH SUMMARY
  // ==================================================

  const fetchSummary =
    useCallback(async () => {
      try {
        const response = await axios.get(
          `${API_URL}/audit-logs/summary`,
          {
            headers: getHeaders(),
          }
        );

        setSummary(response.data);
      } catch (err) {
        console.error(
          "Audit Summary Error:",
          err
        );

        handleAuthError(err);
      }
    }, [handleAuthError]);

  // ==================================================
  // FETCH AUDIT LOGS
  // ==================================================

  const fetchLogs = useCallback(
    async (
      currentSkip,
      currentLimit,
      filters
    ) => {
      try {
        setLoading(true);
        setError("");

        const params = {
          skip: currentSkip,
          limit: currentLimit,
        };

        if (filters.action) {
          params.action = filters.action;
        }

        if (filters.entityType) {
          params.entity_type =
            filters.entityType;
        }

        if (filters.userId) {
          params.user_id = Number(
            filters.userId
          );
        }

        if (filters.entityId) {
          params.entity_id = Number(
            filters.entityId
          );
        }

        if (filters.startDate) {
          params.start_date =
            filters.startDate;
        }

        if (filters.endDate) {
          params.end_date =
            filters.endDate;
        }

        const response = await axios.get(
          `${API_URL}/audit-logs/`,
          {
            headers: getHeaders(),
            params,
          }
        );

        setLogs(
          response.data?.audit_logs || []
        );

        setTotal(
          response.data?.total || 0
        );
      } catch (err) {
        console.error(
          "Audit Logs Error:",
          err
        );

        if (handleAuthError(err)) {
          return;
        }

        setError(
          err.response?.data?.detail ||
            "Unable to load audit logs."
        );
      } finally {
        setLoading(false);
      }
    },
    [handleAuthError]
  );

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const initialFilters = {
      action: "",
      entityType: "",
      userId: "",
      entityId: "",
      startDate: "",
      endDate: "",
    };

    fetchLogs(
      0,
      20,
      initialFilters
    );

    fetchSummary();
  }, [
    isAdmin,
    fetchLogs,
    fetchSummary,
  ]);

  // ==================================================
  // APPLY FILTERS
  // ==================================================

  const handleApplyFilters = async (e) => {
    e.preventDefault();

    if (
      startDate &&
      endDate &&
      startDate > endDate
    ) {
      alert(
        "Start date cannot be greater than end date."
      );
      return;
    }

    const filters = {
      action,
      entityType,
      userId,
      entityId,
      startDate,
      endDate,
    };

    setAppliedFilters(filters);
    setSkip(0);

    await fetchLogs(
      0,
      limit,
      filters
    );
  };

  // ==================================================
  // CLEAR FILTERS
  // ==================================================

  const handleClearFilters =
    async () => {
      setAction("");
      setEntityType("");
      setUserId("");
      setEntityId("");
      setStartDate("");
      setEndDate("");

      const filters = {
        action: "",
        entityType: "",
        userId: "",
        entityId: "",
        startDate: "",
        endDate: "",
      };

      setAppliedFilters(filters);
      setSkip(0);

      await fetchLogs(
        0,
        limit,
        filters
      );
    };

  // ==================================================
  // PAGINATION
  // ==================================================

  const handlePrevious = async () => {
    const newSkip = Math.max(
      0,
      skip - limit
    );

    setSkip(newSkip);

    await fetchLogs(
      newSkip,
      limit,
      appliedFilters
    );
  };

  const handleNext = async () => {
    const newSkip = skip + limit;

    if (newSkip >= total) {
      return;
    }

    setSkip(newSkip);

    await fetchLogs(
      newSkip,
      limit,
      appliedFilters
    );
  };

  const handleLimitChange =
    async (e) => {
      const newLimit = Number(
        e.target.value
      );

      setLimit(newLimit);
      setSkip(0);

      await fetchLogs(
        0,
        newLimit,
        appliedFilters
      );
    };

  // ==================================================
  // GET ONE AUDIT LOG
  // ==================================================

  const handleViewDetails =
    async (auditLogId) => {
      try {
        setDetailsLoading(true);

        const response =
          await axios.get(
            `${API_URL}/audit-logs/${auditLogId}`,
            {
              headers: getHeaders(),
            }
          );

        setSelectedLog(
          response.data
        );
      } catch (err) {
        console.error(
          "Audit Detail Error:",
          err
        );

        if (handleAuthError(err)) {
          return;
        }

        alert(
          err.response?.data?.detail ||
            "Unable to load audit log details."
        );
      } finally {
        setDetailsLoading(false);
      }
    };

  // ==================================================
  // FORMAT DATE
  // ==================================================

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return value;
    }

    return date.toLocaleString();
  };

  // ==================================================
  // FORMAT DETAILS
  // ==================================================

  const formatDetails = (details) => {
    if (
      details === null ||
      details === undefined
    ) {
      return "-";
    }

    if (
      typeof details === "object"
    ) {
      return JSON.stringify(
        details,
        null,
        2
      );
    }

    return String(details);
  };

  // ==================================================
  // ACTION DISPLAY
  // ==================================================

  const formatAction = (value) => {
    if (!value) {
      return "-";
    }

    return value
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  };

  const getActionStyle = (value) => {
    if (
      value === "BOOK_CREATED" ||
      value === "BOOK_ISSUED" ||
      value ===
        "RESERVATION_CREATED"
    ) {
      return greenBadgeStyle;
    }

    if (
      value === "BOOK_UPDATED" ||
      value === "BOOK_RENEWED" ||
      value === "BOOK_RETURNED" ||
      value === "FINE_PAID" ||
      value === "PROFILE_UPDATED" ||
      value === "PASSWORD_CHANGED" ||
      value ===
        "RESERVATION_FULFILLED"
    ) {
      return blueBadgeStyle;
    }

    if (
      value ===
        "BOOK_DEACTIVATED" ||
      value ===
        "RESERVATION_CANCELLED" ||
      value === "LOGIN_FAILED" ||
      value === "ACCOUNT_LOCKED"
    ) {
      return redBadgeStyle;
    }

    if (
      value === "LOGIN_SUCCESS" ||
      value === "ACCOUNT_UNLOCKED"
    ) {
      return greenBadgeStyle;
    }

    return grayBadgeStyle;
  };

  // ==================================================
  // ACTIVE FILTER COUNT
  // ==================================================

  const activeFilterCount =
    Object.values(
      appliedFilters
    ).filter(Boolean).length;

  // ==================================================
  // PAGINATION INFO
  // ==================================================

  const currentStart =
    total === 0 ? 0 : skip + 1;

  const currentEnd = Math.min(
    skip + logs.length,
    total
  );

  const currentPage =
    total === 0
      ? 1
      : Math.floor(skip / limit) + 1;

  const totalPages = Math.max(
    1,
    Math.ceil(total / limit)
  );

  // ==================================================
  // ACCESS CONTROL
  // ==================================================

  if (!isAdmin) {
    return (
      <div style={accessDeniedStyle}>
        <div style={accessIconStyle}>
          !
        </div>

        <div>
          <h2 style={accessTitleStyle}>
            Access Denied
          </h2>

          <p style={accessTextStyle}>
            Audit logs are available
            only to the Administrator.
          </p>
        </div>
      </div>
    );
  }

  // ==================================================
  // PAGE
  // ==================================================

  return (
    <div style={pageStyle}>
      {/* HEADER */}

      <div style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>
            Audit Logs
          </h1>

          <p style={subtitleStyle}>
            Review important actions
            performed in the Smart
            Library Management System.
          </p>
        </div>

        <button
          onClick={async () => {
            await fetchLogs(
              skip,
              limit,
              appliedFilters
            );

            await fetchSummary();
          }}
          style={refreshButtonStyle}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {/* SUMMARY */}

      {summary && (
        <>
          <div
            style={
              sectionHeaderStyle
            }
          >
            <h2
              style={
                sectionTitleStyle
              }
            >
              Audit Summary
            </h2>

            <p
              style={
                sectionSubtitleStyle
              }
            >
              Overview of recorded
              system activity.
            </p>
          </div>

          <div
            style={
              summaryGridStyle
            }
          >
            <SummaryCard
              title="Total Records"
              value={
                summary.total_audit_records ||
                0
              }
              icon="▤"
              background="#dbeafe"
            />

            <SummaryCard
              title="Books Created"
              value={
                summary.book_created ||
                0
              }
              icon="+"
              background="#dcfce7"
            />

            <SummaryCard
              title="Books Updated"
              value={
                summary.book_updated ||
                0
              }
              icon="✎"
              background="#dbeafe"
            />

            <SummaryCard
              title="Books Issued"
              value={
                summary.book_issued ||
                0
              }
              icon="↑"
              background="#fef3c7"
            />

            <SummaryCard
              title="Books Returned"
              value={
                summary.book_returned ||
                0
              }
              icon="↓"
              background="#dcfce7"
            />

            <SummaryCard
              title="Books Renewed"
              value={
                summary.book_renewed ||
                0
              }
              icon="↻"
              background="#e0f2fe"
            />

            <SummaryCard
              title="Fines Paid"
              value={
                summary.fine_paid ||
                0
              }
              icon="₹"
              background="#dcfce7"
            />

            <SummaryCard
              title="Reservations Created"
              value={
                summary.reservation_created ||
                0
              }
              icon="+"
              background="#ede9fe"
            />

            <SummaryCard
              title="Reservations Cancelled"
              value={
                summary.reservation_cancelled ||
                0
              }
              icon="×"
              background="#fee2e2"
            />

            <SummaryCard
              title="Reservations Fulfilled"
              value={
                summary.reservation_fulfilled ||
                0
              }
              icon="✓"
              background="#dcfce7"
            />

            <SummaryCard
              title="Profile Updates"
              value={
                summary.profile_updated ||
                0
              }
              icon="♙"
              background="#dbeafe"
            />

            <SummaryCard
              title="Password Changes"
              value={
                summary.password_changed ||
                0
              }
              icon="⚿"
              background="#fef3c7"
            />

            <SummaryCard
  title="Successful Logins"
  value={
    summary.login_success ||
    0
  }
  icon="✓"
  background="#dcfce7"
/>

<SummaryCard
  title="Failed Logins"
  value={
    summary.login_failed ||
    0
  }
  icon="!"
  background="#fee2e2"
/>


            <SummaryCard
              title="Accounts Locked"
              value={
                summary.account_locked ||
                0
              }
              icon="!"
              background="#fee2e2"
            />

            <SummaryCard
              title="Accounts Unlocked"
              value={
                summary.account_unlocked ||
                0
              }
              icon="✓"
              background="#dcfce7"
            />


          </div>
        </>
      )}

      {/* FILTERS */}

      <div style={filterCardStyle}>
        <div
          style={
            filterHeaderStyle
          }
        >
          <div>
            <h2
              style={cardTitleStyle}
            >
              Filters
            </h2>

            <p
              style={
                cardSubtitleStyle
              }
            >
              Narrow the audit history
              by action, entity, user
              or date.
            </p>
          </div>

          {activeFilterCount >
            0 && (
            <span
              style={
                activeFilterBadgeStyle
              }
            >
              {activeFilterCount} Active
            </span>
          )}
        </div>

        <form
          onSubmit={
            handleApplyFilters
          }
        >
          <div
            style={filterGridStyle}
          >
            {/* ACTION */}

            <div>
              <label
                style={labelStyle}
              >
                Action
              </label>

              <select
                value={action}
                onChange={(e) =>
                  setAction(
                    e.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  All Actions
                </option>

                {ACTIONS.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {formatAction(
                        item
                      )}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* ENTITY TYPE */}

            <div>
              <label
                style={labelStyle}
              >
                Entity Type
              </label>

              <select
                value={
                  entityType
                }
                onChange={(e) =>
                  setEntityType(
                    e.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  All Entities
                </option>

                {ENTITY_TYPES.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* USER ID */}

            <div>
              <label
                style={labelStyle}
              >
                User ID
              </label>

              <input
                type="number"
                min="1"
                value={userId}
                onChange={(e) =>
                  setUserId(
                    e.target.value
                  )
                }
                placeholder="Example: 4"
                style={inputStyle}
              />
            </div>

            {/* ENTITY ID */}

            <div>
              <label
                style={labelStyle}
              >
                Entity ID
              </label>

              <input
                type="number"
                min="1"
                value={entityId}
                onChange={(e) =>
                  setEntityId(
                    e.target.value
                  )
                }
                placeholder="Example: 1"
                style={inputStyle}
              />
            </div>

            {/* START DATE */}

            <div>
              <label
                style={labelStyle}
              >
                Start Date
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </div>

            {/* END DATE */}

            <div>
              <label
                style={labelStyle}
              >
                End Date
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </div>
          </div>

          <div
            style={
              filterActionsStyle
            }
          >
            <button
              type="submit"
              style={
                applyButtonStyle
              }
            >
              Apply Filters
            </button>

            <button
              type="button"
              onClick={
                handleClearFilters
              }
              style={
                clearButtonStyle
              }
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* ACTIVITY HISTORY */}

      <div
        style={activityCardStyle}
      >
        <div
          style={tableHeaderStyle}
        >
          <div>
            <h2
              style={cardTitleStyle}
            >
              Activity History
            </h2>

            <p
              style={
                cardSubtitleStyle
              }
            >
              Showing {currentStart}–
              {currentEnd} of {total}{" "}
              audit records.
            </p>
          </div>

          <div
            style={
              rowsControlStyle
            }
          >
            <label
              style={
                pageSizeLabelStyle
              }
            >
              Rows
            </label>

            <select
              value={limit}
              onChange={
                handleLimitChange
              }
              style={
                pageSizeSelectStyle
              }
            >
              <option value={10}>
                10
              </option>

              <option value={20}>
                20
              </option>

              <option value={50}>
                50
              </option>

              <option value={100}>
                100
              </option>
            </select>
          </div>
        </div>

        {/* TABLE */}

        <div
          style={
            tableContainerStyle
          }
        >
          <table
            style={tableStyle}
          >
            <thead>
              <tr
                style={
                  tableHeaderRowStyle
                }
              >
                <th style={thStyle}>
                  ID
                </th>

                <th style={thStyle}>
                  User
                </th>

                <th style={thStyle}>
                  Action
                </th>

                <th style={thStyle}>
                  Entity
                </th>

                <th style={thStyle}>
                  Entity ID
                </th>

                <th style={thStyle}>
                  Date / Time
                </th>

                <th style={thStyle}>
                  Details
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    style={
                      emptyStyle
                    }
                  >
                    Loading audit
                    logs...
                  </td>
                </tr>
              ) : logs.length ===
                0 ? (
                <tr>
                  <td
                    colSpan="7"
                    style={
                      emptyStyle
                    }
                  >
                    No audit records
                    found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    style={rowStyle}
                  >
                    <td
                      style={
                        idCellStyle
                      }
                    >
                      #{log.id}
                    </td>

                    <td
                      style={tdStyle}
                    >
                      {log.user_id ??
                        "-"}
                    </td>

                    <td
                      style={tdStyle}
                    >
                      <span
                        style={getActionStyle(
                          log.action
                        )}
                      >
                        {formatAction(
                          log.action
                        )}
                      </span>
                    </td>

                    <td
                      style={tdStyle}
                    >
                      <span
                        style={
                          entityBadgeStyle
                        }
                      >
                        {log.entity_type ||
                          "-"}
                      </span>
                    </td>

                    <td
                      style={tdStyle}
                    >
                      {log.entity_id ??
                        "-"}
                    </td>

                    <td
                      style={
                        dateCellStyle
                      }
                    >
                      {formatDate(
                        log.created_at
                      )}
                    </td>

                    <td
                      style={tdStyle}
                    >
                      <button
                        onClick={() =>
                          handleViewDetails(
                            log.id
                          )
                        }
                        style={
                          detailsButtonStyle
                        }
                        disabled={
                          detailsLoading
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        <div
          style={paginationStyle}
        >
          <button
            onClick={
              handlePrevious
            }
            disabled={
              skip === 0 ||
              loading
            }
            style={{
              ...paginationButtonStyle,
              opacity:
                skip === 0 ||
                loading
                  ? 0.45
                  : 1,
              cursor:
                skip === 0 ||
                loading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            ← Previous
          </button>

          <span
            style={pageInfoStyle}
          >
            Page {currentPage} of{" "}
            {totalPages}
          </span>

          <button
            onClick={handleNext}
            disabled={
              skip + limit >=
                total ||
              loading
            }
            style={{
              ...paginationButtonStyle,
              opacity:
                skip + limit >=
                  total ||
                loading
                  ? 0.45
                  : 1,
              cursor:
                skip + limit >=
                  total ||
                loading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* DETAIL MODAL */}

      {selectedLog && (
        <div
          style={modalOverlayStyle}
          onClick={() =>
            setSelectedLog(null)
          }
        >
          <div
            style={modalStyle}
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div
              style={
                modalHeaderStyle
              }
            >
              <div>
                <h2
                  style={
                    modalTitleStyle
                  }
                >
                  Audit Log #
                  {selectedLog.id}
                </h2>

                <p
                  style={
                    modalSubtitleStyle
                  }
                >
                  Complete activity
                  record
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedLog(
                    null
                  )
                }
                style={
                  closeButtonStyle
                }
              >
                ×
              </button>
            </div>

            <div
              style={
                detailGridStyle
              }
            >
              <DetailItem
                label="User ID"
                value={
                  selectedLog.user_id ??
                  "-"
                }
              />

              <DetailItem
                label="Action"
                value={formatAction(
                  selectedLog.action
                )}
              />

              <DetailItem
                label="Entity Type"
                value={
                  selectedLog.entity_type ||
                  "-"
                }
              />

              <DetailItem
                label="Entity ID"
                value={
                  selectedLog.entity_id ??
                  "-"
                }
              />

              <DetailItem
                label="Created At"
                value={formatDate(
                  selectedLog.created_at
                )}
              />
            </div>

            <div
              style={
                detailsSectionStyle
              }
            >
              <div
                style={
                  detailsHeadingStyle
                }
              >
                Details
              </div>

              <pre
                style={
                  detailsPreStyle
                }
              >
                {formatDetails(
                  selectedLog.details
                )}
              </pre>
            </div>

            <div
              style={
                modalFooterStyle
              }
            >
              <button
                onClick={() =>
                  setSelectedLog(
                    null
                  )
                }
                style={
                  modalCloseButtonStyle
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================================================
// SUMMARY CARD
// ==================================================

function SummaryCard({
  title,
  value,
  icon,
  background,
}) {
  return (
    <div style={summaryCardStyle}>
      <div
        style={{
          ...summaryIconStyle,
          backgroundColor:
            background,
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={
            summaryTitleStyle
          }
        >
          {title}
        </div>

        <div
          style={
            summaryValueStyle
          }
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ==================================================
// DETAIL ITEM
// ==================================================

function DetailItem({
  label,
  value,
}) {
  return (
    <div
      style={detailItemStyle}
    >
      <div
        style={detailLabelStyle}
      >
        {label}
      </div>

      <div
        style={detailValueStyle}
      >
        {value}
      </div>
    </div>
  );
}

// ==================================================
// STYLES
// ==================================================

const pageStyle = {
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};

// PAGE HEADER

const pageHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  flexWrap: "wrap",
  marginBottom: "22px",
};

const pageTitleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "34px",
  fontWeight: "700",
};

const subtitleStyle = {
  color: "#64748b",
  margin: "5px 0 0 0",
  fontSize: "14px",
};

const refreshButtonStyle = {
  backgroundColor: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "7px",
  padding: "8px 13px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "12px",
};

// SECTION

const sectionHeaderStyle = {
  marginBottom: "11px",
};

const sectionTitleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "19px",
  fontWeight: "700",
};

const sectionSubtitleStyle = {
  margin: "3px 0 0 0",
  color: "#64748b",
  fontSize: "11px",
};

// SUMMARY

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "11px",
  marginBottom: "20px",
};

const summaryCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "11px",

  backgroundColor: "#ffffff",

  borderRadius: "10px",

  padding: "13px 14px",

  border: "1px solid #e5e7eb",

  boxShadow:
    "0 2px 7px rgba(15,23,42,0.035)",

  minWidth: 0,
};

const summaryIconStyle = {
  width: "38px",
  height: "38px",
  minWidth: "38px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "9px",

  fontSize: "15px",

  fontWeight: "700",
};

const summaryValueStyle = {
  marginTop: "3px",

  color: "#0f172a",

  fontSize: "19px",

  fontWeight: "700",

  lineHeight: "1.1",
};

const summaryTitleStyle = {
  color: "#64748b",

  fontSize: "10px",

  fontWeight: "600",
};

// FILTER CARD

const filterCardStyle = {
  backgroundColor: "#ffffff",

  padding: "16px",

  borderRadius: "11px",

  border: "1px solid #e5e7eb",

  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",

  marginBottom: "18px",
};

const filterHeaderStyle = {
  display: "flex",

  justifyContent: "space-between",

  alignItems: "center",

  gap: "12px",

  marginBottom: "13px",
};

const cardTitleStyle = {
  margin: 0,

  color: "#111827",

  fontSize: "18px",

  fontWeight: "700",
};

const cardSubtitleStyle = {
  margin: "3px 0 0 0",

  color: "#64748b",

  fontSize: "11px",
};

const activeFilterBadgeStyle = {
  backgroundColor: "#dbeafe",

  color: "#1d4ed8",

  padding: "4px 8px",

  borderRadius: "12px",

  fontSize: "10px",

  fontWeight: "700",

  whiteSpace: "nowrap",
};

const filterGridStyle = {
  display: "grid",

  gridTemplateColumns:
    "repeat(auto-fit, minmax(160px, 1fr))",

  gap: "11px",
};

const labelStyle = {
  display: "block",

  marginBottom: "5px",

  fontWeight: "600",

  color: "#475569",

  fontSize: "11px",
};

const inputStyle = {
  width: "100%",

  boxSizing: "border-box",

  padding: "7px 9px",

  border: "1px solid #d1d5db",

  borderRadius: "6px",

  backgroundColor: "#ffffff",

  color: "#334155",

  fontSize: "11px",

  outline: "none",
};

const filterActionsStyle = {
  display: "flex",

  gap: "8px",

  flexWrap: "wrap",

  marginTop: "12px",
};

const applyButtonStyle = {
  backgroundColor: "#2563eb",

  color: "#ffffff",

  border: "none",

  borderRadius: "6px",

  padding: "7px 11px",

  cursor: "pointer",

  fontWeight: "600",

  fontSize: "11px",
};

const clearButtonStyle = {
  backgroundColor: "#f1f5f9",

  color: "#475569",

  border: "1px solid #e2e8f0",

  borderRadius: "6px",

  padding: "7px 11px",

  cursor: "pointer",

  fontWeight: "600",

  fontSize: "11px",
};

// ACTIVITY CARD

const activityCardStyle = {
  backgroundColor: "#ffffff",

  padding: "16px",

  borderRadius: "11px",

  border: "1px solid #e5e7eb",

  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const tableHeaderStyle = {
  display: "flex",

  justifyContent: "space-between",

  alignItems: "center",

  gap: "12px",

  flexWrap: "wrap",

  marginBottom: "11px",
};

const rowsControlStyle = {
  display: "flex",

  alignItems: "center",

  gap: "6px",
};

const pageSizeLabelStyle = {
  fontWeight: "600",

  color: "#475569",

  fontSize: "11px",
};

const pageSizeSelectStyle = {
  padding: "6px 8px",

  border: "1px solid #d1d5db",

  borderRadius: "6px",

  backgroundColor: "#ffffff",

  color: "#334155",

  fontSize: "11px",
};

// TABLE

const tableContainerStyle = {
  width: "100%",

  overflowX: "auto",

  border: "1px solid #e5e7eb",

  borderRadius: "8px",
};

const tableStyle = {
  width: "100%",

  borderCollapse: "collapse",

  fontSize: "12px",
};

const tableHeaderRowStyle = {
  backgroundColor: "#f8fafc",

  borderBottom: "1px solid #dbe2ea",
};

const thStyle = {
  textAlign: "left",

  padding: "9px 9px",

  whiteSpace: "nowrap",

  color: "#475569",

  fontSize: "10px",

  fontWeight: "700",
};

const tdStyle = {
  padding: "9px 9px",

  borderBottom: "1px solid #eef2f7",

  verticalAlign: "middle",

  color: "#475569",

  lineHeight: "1.35",
};

const idCellStyle = {
  ...tdStyle,

  color: "#1d4ed8",

  fontWeight: "700",
};

const dateCellStyle = {
  ...tdStyle,

  whiteSpace: "nowrap",

  color: "#64748b",

  fontSize: "11px",
};

const rowStyle = {
  backgroundColor: "#ffffff",
};

const emptyStyle = {
  textAlign: "center",

  padding: "26px",

  color: "#64748b",

  fontSize: "12px",
};

// BADGES

const badgeBase = {
  display: "inline-block",

  padding: "3px 7px",

  borderRadius: "10px",

  fontSize: "9px",

  fontWeight: "700",

  whiteSpace: "nowrap",
};

const greenBadgeStyle = {
  ...badgeBase,

  backgroundColor: "#dcfce7",

  color: "#166534",
};

const blueBadgeStyle = {
  ...badgeBase,

  backgroundColor: "#dbeafe",

  color: "#1d4ed8",
};

const redBadgeStyle = {
  ...badgeBase,

  backgroundColor: "#fee2e2",

  color: "#991b1b",
};

const grayBadgeStyle = {
  ...badgeBase,

  backgroundColor: "#f1f5f9",

  color: "#475569",
};

const entityBadgeStyle = {
  display: "inline-block",

  backgroundColor: "#f1f5f9",

  color: "#475569",

  padding: "3px 7px",

  borderRadius: "10px",

  fontSize: "9px",

  fontWeight: "700",
};

// DETAILS BUTTON

const detailsButtonStyle = {
  backgroundColor: "#eff6ff",

  color: "#1d4ed8",

  border: "1px solid #bfdbfe",

  borderRadius: "6px",

  padding: "5px 8px",

  cursor: "pointer",

  fontWeight: "600",

  fontSize: "10px",
};

// PAGINATION

const paginationStyle = {
  display: "flex",

  justifyContent: "center",

  alignItems: "center",

  gap: "11px",

  marginTop: "14px",
};

const paginationButtonStyle = {
  backgroundColor: "#2563eb",

  color: "#ffffff",

  border: "none",

  borderRadius: "6px",

  padding: "6px 10px",

  fontSize: "10px",

  fontWeight: "600",
};

const pageInfoStyle = {
  fontWeight: "600",

  color: "#475569",

  fontSize: "11px",
};

// MODAL

const modalOverlayStyle = {
  position: "fixed",

  top: 0,

  left: 0,

  right: 0,

  bottom: 0,

  backgroundColor:
    "rgba(15, 23, 42, 0.48)",

  display: "flex",

  justifyContent: "center",

  alignItems: "center",

  zIndex: 1000,

  padding: "20px",
};

const modalStyle = {
  width: "100%",

  maxWidth: "620px",

  maxHeight: "85vh",

  overflowY: "auto",

  backgroundColor: "#ffffff",

  borderRadius: "12px",

  padding: "18px",

  boxSizing: "border-box",

  boxShadow:
    "0 20px 50px rgba(15,23,42,0.20)",
};

const modalHeaderStyle = {
  display: "flex",

  justifyContent: "space-between",

  alignItems: "flex-start",

  gap: "15px",

  paddingBottom: "12px",

  borderBottom: "1px solid #eef2f7",
};

const modalTitleStyle = {
  margin: 0,

  color: "#111827",

  fontSize: "19px",

  fontWeight: "700",
};

const modalSubtitleStyle = {
  color: "#64748b",

  margin: "3px 0 0 0",

  fontSize: "11px",
};

const closeButtonStyle = {
  border: "none",

  backgroundColor: "#f1f5f9",

  color: "#475569",

  width: "28px",

  height: "28px",

  borderRadius: "7px",

  fontSize: "19px",

  cursor: "pointer",

  display: "flex",

  alignItems: "center",

  justifyContent: "center",
};

// DETAIL GRID

const detailGridStyle = {
  display: "grid",

  gridTemplateColumns:
    "repeat(auto-fit, minmax(150px, 1fr))",

  gap: "9px",

  marginTop: "14px",
};

const detailItemStyle = {
  backgroundColor: "#f8fafc",

  padding: "10px",

  borderRadius: "7px",

  border: "1px solid #eef2f7",
};

const detailLabelStyle = {
  fontSize: "10px",

  color: "#64748b",

  fontWeight: "600",
};

const detailValueStyle = {
  marginTop: "3px",

  color: "#334155",

  fontWeight: "700",

  fontSize: "12px",

  wordBreak: "break-word",
};

const detailsSectionStyle = {
  marginTop: "14px",
};

const detailsHeadingStyle = {
  color: "#334155",

  fontSize: "12px",

  fontWeight: "700",

  marginBottom: "6px",
};

const detailsPreStyle = {
  margin: 0,

  backgroundColor: "#f8fafc",

  padding: "11px",

  borderRadius: "7px",

  border: "1px solid #eef2f7",

  whiteSpace: "pre-wrap",

  wordBreak: "break-word",

  fontFamily:
    "Consolas, 'Courier New', monospace",

  fontSize: "10px",

  color: "#475569",

  lineHeight: "1.5",
};

const modalFooterStyle = {
  display: "flex",

  justifyContent: "flex-end",

  marginTop: "14px",

  paddingTop: "12px",

  borderTop: "1px solid #eef2f7",
};

const modalCloseButtonStyle = {
  backgroundColor: "#334155",

  color: "#ffffff",

  border: "none",

  borderRadius: "6px",

  padding: "7px 12px",

  cursor: "pointer",

  fontSize: "11px",

  fontWeight: "600",
};

// ERROR

const errorStyle = {
  backgroundColor: "#fee2e2",

  color: "#991b1b",

  padding: "10px 12px",

  borderRadius: "7px",

  marginBottom: "18px",

  border: "1px solid #fecaca",

  fontSize: "12px",
};

// ACCESS DENIED

const accessDeniedStyle = {
  display: "flex",

  alignItems: "flex-start",

  gap: "12px",

  backgroundColor: "#fff1f2",

  color: "#991b1b",

  padding: "17px",

  borderRadius: "10px",

  border: "1px solid #fecdd3",
};

const accessIconStyle = {
  width: "30px",

  height: "30px",

  minWidth: "30px",

  display: "flex",

  alignItems: "center",

  justifyContent: "center",

  borderRadius: "8px",

  backgroundColor: "#fee2e2",

  color: "#dc2626",

  fontWeight: "700",
};

const accessTitleStyle = {
  margin: 0,

  fontSize: "15px",
};

const accessTextStyle = {
  margin: "4px 0 0 0",

  fontSize: "12px",
};

export default AuditLogs;