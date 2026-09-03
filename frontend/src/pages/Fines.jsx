import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Fines() {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] =
    useState(null);

  const navigate = useNavigate();

  // ==================================================
  // CURRENT USER / ROLE
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
  const isLibrarian = roleId === 3;
  const isMember = roleId === 4;

  const isStaff = isAdmin || isLibrarian;

  // ==================================================
  // TOKEN / HEADERS
  // ==================================================

  const getToken = () => {
    return localStorage.getItem("token");
  };

  const getHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
  });

  // ==================================================
  // AUTH ERROR
  // ==================================================

  const handleAuthError = (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role_id");

    navigate("/");

    return true;
  }

  return false;
};

  // ==================================================
  // NORMALIZE RESPONSE
  // ==================================================

  const normalizeArray = (data) => {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.fines)) {
      return data.fines;
    }

    if (Array.isArray(data?.issues)) {
      return data.issues;
    }

    if (Array.isArray(data?.items)) {
      return data.items;
    }

    if (Array.isArray(data?.results)) {
      return data.results;
    }

    return [];
  };

  // ==================================================
  // MEMBER FINES
  // ==================================================

  const fetchMemberFines = async () => {
    const response = await axios.get(
      "https://smartlibrarymanagement-production.up.railway.app/issues/me/fines",
      {
        headers: getHeaders(),
      }
    );

    return normalizeArray(response.data);
  };

  // ==================================================
  // STAFF FINES
  // ==================================================

  const fetchStaffFines = async () => {
    const [
      unpaidResponse,
      paidResponse,
    ] = await Promise.all([
      axios.get(
        "https://smartlibrarymanagement-production.up.railway.app/issues/fines/unpaid",
        {
          headers: getHeaders(),
        }
      ),

      axios.get(
        "https://smartlibrarymanagement-production.up.railway.app/issues/fines/paid",
        {
          headers: getHeaders(),
        }
      ),
    ]);

    const unpaid = normalizeArray(
      unpaidResponse.data
    ).map((item) => ({
      ...item,
      fine_status:
        item.fine_status || "UNPAID",
    }));

    const paid = normalizeArray(
      paidResponse.data
    ).map((item) => ({
      ...item,
      fine_status:
        item.fine_status || "PAID",
    }));

    return [...unpaid, ...paid];
  };

  // ==================================================
  // FETCH FINES
  // ==================================================

  const fetchFines = async () => {
    try {
      setError("");

      if (!getToken()) {
        navigate("/");
        return;
      }

      let data = [];

      if (isMember) {
        data = await fetchMemberFines();
      } else if (isStaff) {
        data = await fetchStaffFines();
      }

      data.sort((a, b) => {
        const idA = Number(
          a.issue_id ?? a.id ?? 0
        );

        const idB = Number(
          b.issue_id ?? b.id ?? 0
        );

        return idB - idA;
      });

      setFines(data);
    } catch (error) {
      console.error(
        "Fines Error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Unable to load fine information."
      );
    }
  };

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        await fetchFines();
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================================================
  // HELPERS
  // ==================================================

  const getIssueId = (fine) => {
    return fine.issue_id ?? fine.id;
  };

  const getFineStatus = (fine) => {
    if (fine.fine_status) {
      return String(
        fine.fine_status
      ).toUpperCase();
    }

    if (fine.fine_paid_at) {
      return "PAID";
    }

    return "UNPAID";
  };

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  // ==================================================
  // MARK PAID
  // ==================================================

  const handleMarkPaid = async (fine) => {
    if (!isStaff) {
      return;
    }

    const issueId = getIssueId(fine);

    if (!issueId) {
      alert(
        "Unable to determine issue ID."
      );

      return;
    }

    const amount = Number(
      fine.fine_amount || 0
    );

    const confirmed = window.confirm(
      `Mark fine of ₹${amount.toFixed(
        2
      )} for Issue #${issueId} as paid?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(issueId);

      await axios.put(
        `https://smartlibrarymanagement-production.up.railway.app/issues/${issueId}/fine/pay`,
        {},
        {
          headers: getHeaders(),
        }
      );

      alert(
        "Fine marked as paid successfully."
      );

      await fetchFines();
    } catch (error) {
      console.error(
        "Fine Payment Error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      alert(
        error.response?.data?.detail ||
          "Unable to mark fine as paid."
      );
    } finally {
      setProcessingId(null);
    }
  };

  // ==================================================
  // CALCULATIONS
  // ==================================================

  const totalFineAmount = fines.reduce(
    (sum, fine) =>
      sum +
      Number(fine.fine_amount || 0),
    0
  );

  const paidFines = fines.filter(
    (fine) =>
      getFineStatus(fine) === "PAID"
  );

  const unpaidFines = fines.filter(
    (fine) =>
      getFineStatus(fine) === "UNPAID"
  );

  const paidAmount = paidFines.reduce(
    (sum, fine) =>
      sum +
      Number(fine.fine_amount || 0),
    0
  );

  const outstandingAmount =
    unpaidFines.reduce(
      (sum, fine) =>
        sum +
        Number(fine.fine_amount || 0),
      0
    );

  // ==================================================
  // STATUS STYLE
  // ==================================================

  const getStatusStyle = (status) => {
    if (status === "PAID") {
      return {
        ...statusBadgeStyle,
        backgroundColor: "#dcfce7",
        color: "#166534",
      };
    }

    return {
      ...statusBadgeStyle,
      backgroundColor: "#fee2e2",
      color: "#991b1b",
    };
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <div style={loadingStyle}>
        {isMember
          ? "Loading my fines..."
          : "Loading fines..."}
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
        <h1 style={pageTitleStyle}>
          {isMember
            ? "My Fines"
            : "Fine Management"}
        </h1>

        <p style={pageSubtitleStyle}>
          {isMember
            ? "View fines generated from overdue book returns."
            : "Review outstanding and paid library fines."}
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <div style={summaryGridStyle}>
        <SummaryCard
          title="Fine Cases"
          value={fines.length}
          icon="▤"
          background="#dbeafe"
        />

        <SummaryCard
          title="Total Fines"
          value={`₹${totalFineAmount.toFixed(
            2
          )}`}
          icon="₹"
          background="#fef3c7"
        />

        <SummaryCard
          title="Paid"
          value={`₹${paidAmount.toFixed(2)}`}
          icon="✓"
          background="#dcfce7"
        />

        <SummaryCard
          title="Outstanding"
          value={`₹${outstandingAmount.toFixed(
            2
          )}`}
          icon="!"
          background="#fee2e2"
          valueColor={
            outstandingAmount > 0
              ? "#dc2626"
              : "#16a34a"
          }
        />
      </div>

      {/* TABLE CARD */}

      <div style={recordsCardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>
              {isMember
                ? "My Fine Records"
                : "Fine Records"}
            </h2>

            <p style={sectionSubtitleStyle}>
              {unpaidFines.length} unpaid
              {" · "}
              {paidFines.length} paid
            </p>
          </div>

          <span style={countStyle}>
            {fines.length} Record(s)
          </span>
        </div>

        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={headerRowStyle}>
                <th style={headerStyle}>
                  Issue ID
                </th>

                {isStaff && (
                  <th style={headerStyle}>
                    User ID
                  </th>
                )}

                <th style={headerStyle}>
                  Book ID
                </th>

                <th style={headerStyle}>
                  Overdue Days
                </th>

                <th style={headerStyle}>
                  Fine
                </th>

                <th style={headerStyle}>
                  Status
                </th>

                <th style={headerStyle}>
                  Paid At
                </th>

                {isStaff && (
                  <th style={headerStyle}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {fines.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      isStaff ? 8 : 6
                    }
                    style={emptyStyle}
                  >
                    {isMember
                      ? "You do not have any fine records."
                      : "No fine records found."}
                  </td>
                </tr>
              ) : (
                fines.map(
                  (fine, index) => {
                    const issueId =
                      getIssueId(fine);

                    const status =
                      getFineStatus(fine);

                    return (
                      <tr
                        key={
                          issueId ??
                          `fine-${index}`
                        }
                        style={rowStyle}
                      >
                        <td style={cellStyle}>
                          {issueId ?? "-"}
                        </td>

                        {isStaff && (
                          <td style={cellStyle}>
                            {fine.user_id ??
                              "-"}
                          </td>
                        )}

                        <td style={cellStyle}>
                          {fine.book_id ??
                            "-"}
                        </td>

                        <td style={cellStyle}>
                          <span
                            style={
                              overdueBadgeStyle
                            }
                          >
                            {fine.overdue_days ??
                              0}
                          </span>
                        </td>

                        <td
                          style={
                            amountCellStyle
                          }
                        >
                          ₹
                          {Number(
                            fine.fine_amount ||
                              0
                          ).toFixed(2)}
                        </td>

                        <td style={cellStyle}>
                          <span
                            style={getStatusStyle(
                              status
                            )}
                          >
                            {status}
                          </span>
                        </td>

                        <td style={dateCellStyle}>
                          {formatDate(
                            fine.fine_paid_at
                          )}
                        </td>

                        {isStaff && (
                          <td style={cellStyle}>
                            {status ===
                            "UNPAID" ? (
                              <button
                                onClick={() =>
                                  handleMarkPaid(
                                    fine
                                  )
                                }
                                disabled={
                                  processingId ===
                                  issueId
                                }
                                style={{
                                  ...payButtonStyle,

                                  opacity:
                                    processingId ===
                                    issueId
                                      ? 0.6
                                      : 1,

                                  cursor:
                                    processingId ===
                                    issueId
                                      ? "not-allowed"
                                      : "pointer",
                                }}
                              >
                                {processingId ===
                                issueId
                                  ? "Processing..."
                                  : "Mark Paid"}
                              </button>
                            ) : (
                              <span
                                style={
                                  completedTextStyle
                                }
                              >
                                ✓ Paid
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MEMBER OUTSTANDING NOTICE */}

      {isMember &&
        outstandingAmount > 0 && (
          <div style={memberNoteStyle}>
            <div style={noteIconStyle}>
              !
            </div>

            <div>
              <div style={noteTitleStyle}>
                Outstanding Fine
              </div>

              <div style={noteTextStyle}>
                You currently have an
                outstanding fine of{" "}
                <strong>
                  ₹
                  {outstandingAmount.toFixed(
                    2
                  )}
                </strong>
                . Please contact library
                staff regarding payment.
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
  valueColor = "#0f172a",
}) {
  return (
    <div style={summaryCardStyle}>
      <div
        style={{
          ...summaryIconStyle,
          backgroundColor: background,
        }}
      >
        {icon}
      </div>

      <div>
        <div style={summaryLabelStyle}>
          {title}
        </div>

        <div
          style={{
            ...summaryValueStyle,
            color: valueColor,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ==================================================
// STYLES
// ==================================================

const pageStyle = {
  width: "100%",
  boxSizing: "border-box",
};

const pageHeaderStyle = {
  marginBottom: "22px",
};

const pageTitleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "34px",
  fontWeight: "700",
};

const pageSubtitleStyle = {
  margin: "5px 0 0 0",
  color: "#64748b",
  fontSize: "14px",
};

// ==================================================
// SUMMARY
// ==================================================

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "14px",
  marginBottom: "22px",
};

const summaryCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "13px",

  backgroundColor: "#ffffff",

  padding: "15px 17px",

  borderRadius: "11px",

  border: "1px solid #e5e7eb",

  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",

  minWidth: 0,
};

const summaryIconStyle = {
  width: "44px",
  height: "44px",
  minWidth: "44px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "10px",

  fontSize: "19px",
  fontWeight: "700",
};

const summaryLabelStyle = {
  color: "#64748b",

  fontSize: "12px",

  fontWeight: "600",

  marginBottom: "4px",
};

const summaryValueStyle = {
  fontSize: "22px",

  fontWeight: "700",

  lineHeight: "1.1",
};

// ==================================================
// RECORDS CARD
// ==================================================

const recordsCardStyle = {
  backgroundColor: "#ffffff",

  border: "1px solid #e5e7eb",

  borderRadius: "12px",

  padding: "18px",

  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const sectionHeaderStyle = {
  display: "flex",

  justifyContent: "space-between",

  alignItems: "center",

  gap: "15px",

  marginBottom: "14px",
};

const sectionTitleStyle = {
  margin: 0,

  color: "#111827",

  fontSize: "20px",

  fontWeight: "700",
};

const sectionSubtitleStyle = {
  margin: "4px 0 0 0",

  color: "#64748b",

  fontSize: "12px",
};

const countStyle = {
  backgroundColor: "#dbeafe",

  color: "#1d4ed8",

  padding: "5px 10px",

  borderRadius: "16px",

  fontSize: "11px",

  fontWeight: "700",

  whiteSpace: "nowrap",
};

// ==================================================
// TABLE
// ==================================================

const tableContainerStyle = {
  width: "100%",

  overflowX: "auto",

  borderTop: "1px solid #eef2f7",
};

const tableStyle = {
  width: "100%",

  borderCollapse: "collapse",

  fontSize: "13px",
};

const headerRowStyle = {
  textAlign: "left",

  backgroundColor: "#f8fafc",

  borderBottom: "1px solid #d1d5db",
};

const headerStyle = {
  padding: "10px 10px",

  color: "#475569",

  whiteSpace: "nowrap",

  textAlign: "left",

  fontSize: "12px",

  fontWeight: "700",
};

const rowStyle = {
  borderBottom: "1px solid #eef2f7",
};

const cellStyle = {
  padding: "10px",

  verticalAlign: "middle",

  color: "#475569",

  lineHeight: "1.35",
};

const amountCellStyle = {
  ...cellStyle,

  color: "#0f172a",

  fontWeight: "700",

  whiteSpace: "nowrap",
};

const dateCellStyle = {
  ...cellStyle,

  minWidth: "120px",

  fontSize: "12px",

  color: "#64748b",
};

const emptyStyle = {
  textAlign: "center",

  padding: "24px",

  color: "#64748b",

  fontSize: "13px",
};

// ==================================================
// BADGES
// ==================================================

const statusBadgeStyle = {
  display: "inline-block",

  padding: "4px 8px",

  borderRadius: "12px",

  fontWeight: "700",

  fontSize: "11px",

  whiteSpace: "nowrap",
};

const overdueBadgeStyle = {
  display: "inline-flex",

  alignItems: "center",

  justifyContent: "center",

  minWidth: "24px",

  padding: "3px 7px",

  borderRadius: "10px",

  backgroundColor: "#fff7ed",

  color: "#c2410c",

  fontSize: "11px",

  fontWeight: "700",
};

// ==================================================
// BUTTONS
// ==================================================

const payButtonStyle = {
  padding: "6px 10px",

  backgroundColor: "#16a34a",

  color: "#ffffff",

  border: "none",

  borderRadius: "6px",

  fontWeight: "600",

  fontSize: "11px",

  whiteSpace: "nowrap",
};

const completedTextStyle = {
  color: "#16a34a",

  fontWeight: "700",

  fontSize: "11px",

  whiteSpace: "nowrap",
};

// ==================================================
// MEMBER NOTE
// ==================================================

const memberNoteStyle = {
  display: "flex",

  alignItems: "flex-start",

  gap: "12px",

  marginTop: "18px",

  padding: "14px 16px",

  backgroundColor: "#fff7ed",

  color: "#9a3412",

  borderRadius: "10px",

  border: "1px solid #fed7aa",
};

const noteIconStyle = {
  width: "30px",

  height: "30px",

  minWidth: "30px",

  display: "flex",

  alignItems: "center",

  justifyContent: "center",

  borderRadius: "8px",

  backgroundColor: "#ffedd5",

  color: "#c2410c",

  fontWeight: "700",
};

const noteTitleStyle = {
  marginBottom: "3px",

  fontSize: "13px",

  fontWeight: "700",
};

const noteTextStyle = {
  fontSize: "12px",

  lineHeight: "1.5",
};

// ==================================================
// MESSAGES
// ==================================================

const errorStyle = {
  backgroundColor: "#fee2e2",

  color: "#991b1b",

  padding: "10px 12px",

  borderRadius: "7px",

  marginBottom: "18px",

  border: "1px solid #fecaca",

  fontSize: "13px",
};

const loadingStyle = {
  padding: "35px",

  textAlign: "center",

  color: "#64748b",

  fontSize: "14px",
};

export default Fines;
