import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Reports() {
  const navigate = useNavigate();

  const [reportType, setReportType] = useState("summary");
  const [reportData, setReportData] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");

  // ==================================================
  // USER / ROLE
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
  const isStaff = isAdmin || isLibrarian;

  // ==================================================
  // AUTH
  // ==================================================

  const getToken = () => localStorage.getItem("token");

  const getHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
  });

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
  // REPORT CONFIGURATION
  // ==================================================

  const reportOptions = [
    {
      value: "summary",
      label: "Summary",
      endpoint: "/reports/summary",
    },
    {
      value: "issued-books",
      label: "Issued Books",
      endpoint: "/reports/issued-books",
    },
    {
      value: "overdue-books",
      label: "Overdue Books",
      endpoint: "/reports/overdue-books",
    },
    {
      value: "fines",
      label: "Fines",
      endpoint: "/reports/fines",
    },
    {
      value: "most-borrowed-books",
      label: "Most Borrowed Books",
      endpoint: "/reports/most-borrowed-books",
    },
    {
      value: "reservations",
      label: "Reservations",
      endpoint: "/reports/reservations",
    },
    {
      value: "member-activity",
      label: "Member Activity",
      endpoint: "/reports/member-activity",
    },
    {
      value: "issue-history",
      label: "Issue History",
      endpoint: "/reports/issue-history",
    },
  ];

  const supportsDateFilter =
    reportType === "issued-books" ||
    reportType === "issue-history";

  // ==================================================
  // FETCH REPORT
  // ==================================================

  const fetchReport = async () => {
    if (!isStaff) {
      setError(
        "Reports are available only to Admin and Librarian users."
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const selected = reportOptions.find(
        (item) => item.value === reportType
      );

      if (!selected) {
        setError("Invalid report type.");
        return;
      }

      const params = {};

      if (supportsDateFilter) {
        if (startDate) {
          params.start_date = startDate;
        }

        if (endDate) {
          params.end_date = endDate;
        }
      }

      const response = await axios.get(
        `http://127.0.0.1:8000${selected.endpoint}`,
        {
          headers: getHeaders(),
          params,
        }
      );

      console.log(
        `${selected.label} Report:`,
        response.data
      );

      setReportData(response.data);
    } catch (error) {
      console.error("Report Error:", error);

      if (handleAuthError(error)) {
        return;
      }

      if (error.response?.status === 403) {
        setError(
          "You do not have permission to view reports."
        );
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Unable to load report."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // INITIAL / REPORT CHANGE
  // ==================================================

  useEffect(() => {
    fetchReport();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType]);

  // ==================================================
  // DATE VALIDATION
  // ==================================================

  const handleApplyFilter = () => {
    if (
      startDate &&
      endDate &&
      startDate > endDate
    ) {
      alert(
        "Start date cannot be after end date."
      );
      return;
    }

    fetchReport();
  };

  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");

    setTimeout(() => {
      fetchReportWithoutDates();
    }, 0);
  };

  const fetchReportWithoutDates = async () => {
    try {
      setLoading(true);
      setError("");

      const selected = reportOptions.find(
        (item) => item.value === reportType
      );

      const response = await axios.get(
        `http://127.0.0.1:8000${selected.endpoint}`,
        {
          headers: getHeaders(),
        }
      );

      setReportData(response.data);
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Unable to load report."
      );
    } finally {
      setLoading(false);
    }
  };


  const handleExport = async (format) => {
    const token = getToken();

    if (!token) {
      navigate("/");
      return;
    }

    if (
      supportsDateFilter &&
      startDate &&
      endDate &&
      startDate > endDate
    ) {
      alert("Start date cannot be after end date.");
      return;
    }

    try {
      setExporting(format);
      setError("");

      const params = {};

      if (supportsDateFilter) {
        if (startDate) {
          params.start_date = startDate;
        }

        if (endDate) {
          params.end_date = endDate;
        }
      }

      const response = await axios.get(
        `http://127.0.0.1:8000/reports/export/${reportType}/${format}`,
        {
          headers: getHeaders(),
          params,
          responseType: "blob",
        }
      );

      const contentDisposition =
        response.headers["content-disposition"] || "";

      const filenameMatch = contentDisposition.match(
        /filename="?([^"]+)"?/i
      );

      const fallbackFilename =
        `smart_library_${reportType.replaceAll("-", "_")}.` +
        (format === "pdf" ? "pdf" : "xlsx");

      const filename =
        filenameMatch?.[1]?.trim() ||
        fallbackFilename;

      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data])
      );

      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Report Export Error:", error);

      if (handleAuthError(error)) {
        return;
      }

      if (error.response?.status === 403) {
        setError(
          "You do not have permission to export reports."
        );
        return;
      }

      setError(
        `Unable to export ${format.toUpperCase()} report.`
      );
    } finally {
      setExporting("");
    }
  };

  // ==================================================
  // FORMATTERS
  // ==================================================

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

  const money = (value) => {
    return `₹${Number(value || 0).toFixed(2)}`;
  };

  // ==================================================
  // STATUS BADGE
  // ==================================================

  const renderStatus = (status) => {
    if (!status) {
      return "-";
    }

    const value = String(status).toUpperCase();

    let style = {
      ...statusBadgeStyle,
      backgroundColor: "#f1f5f9",
      color: "#475569",
    };

    if (
      value === "ISSUED" ||
      value === "ACTIVE" ||
      value === "READY"
    ) {
      style = {
        ...statusBadgeStyle,
        backgroundColor: "#dbeafe",
        color: "#1d4ed8",
      };
    }

    if (
      value === "RETURNED" ||
      value === "PAID" ||
      value === "FULFILLED"
    ) {
      style = {
        ...statusBadgeStyle,
        backgroundColor: "#dcfce7",
        color: "#166534",
      };
    }

    if (
      value === "OVERDUE" ||
      value === "UNPAID"
    ) {
      style = {
        ...statusBadgeStyle,
        backgroundColor: "#fee2e2",
        color: "#991b1b",
      };
    }

    if (
      value === "EXPIRED" ||
      value === "CANCELLED"
    ) {
      style = {
        ...statusBadgeStyle,
        backgroundColor: "#f1f5f9",
        color: "#64748b",
      };
    }

    return <span style={style}>{value}</span>;
  };

  // ==================================================
  // TABLE COMPONENT
  // ==================================================

  const ReportTable = ({
    columns,
    rows,
    emptyMessage = "No records found.",
  }) => {
    return (
      <div style={tableContainerStyle}>
        <table style={tableStyle}>
          <thead>
            <tr style={headerRowStyle}>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={headerStyle}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {!rows || rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={emptyStyle}
                >
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={
                    row.issue_id ||
                    row.reservation_id ||
                    row.user_id ||
                    row.book_id ||
                    index
                  }
                  style={rowStyle}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={cellStyle}
                    >
                      {column.render
                        ? column.render(row)
                        : row[column.key] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // ==================================================
  // SUMMARY
  // ==================================================

  const renderSummary = () => {
    if (!reportData) {
      return null;
    }

    const cards = [
      {
        label: "Total Members",
        value: reportData.total_members ?? 0,
        icon: "👥",
        background: "#dbeafe",
      },
      {
        label: "Book Titles",
        value: reportData.total_books ?? 0,
        icon: "📚",
        background: "#ede9fe",
      },
      {
        label: "Currently Issued",
        value: reportData.currently_issued ?? 0,
        icon: "📖",
        background: "#e0f2fe",
      },
      {
        label: "Returned Books",
        value: reportData.returned_books ?? 0,
        icon: "✓",
        background: "#dcfce7",
      },
      {
        label: "Active Reservations",
        value: reportData.active_reservations ?? 0,
        icon: "◷",
        background: "#fef3c7",
      },
      {
        label: "Overdue Books",
        value: reportData.overdue_books ?? 0,
        icon: "!",
        background: "#fee2e2",
        danger:
          Number(reportData.overdue_books || 0) > 0,
      },
      {
        label: "Fines Generated",
        value: money(
          reportData.total_fines_generated
        ),
        icon: "₹",
        background: "#ffedd5",
      },
      {
        label: "Fines Paid",
        value: money(
          reportData.total_fines_paid
        ),
        icon: "✓",
        background: "#dcfce7",
      },
      {
        label: "Outstanding Fines",
        value: money(
          reportData.total_fines_outstanding
        ),
        icon: "₹",
        background: "#fee2e2",
        danger:
          Number(
            reportData.total_fines_outstanding || 0
          ) > 0,
      },
    ];

    return (
      <div style={summaryGridStyle}>
        {cards.map((card) => (
          <div
            key={card.label}
            style={summaryCardStyle}
          >
            <div
              style={{
                ...summaryIconStyle,
                backgroundColor: card.background,
              }}
            >
              {card.icon}
            </div>

            <div>
              <div style={summaryLabelStyle}>
                {card.label}
              </div>

              <div
                style={{
                  ...summaryValueStyle,
                  color: card.danger
                    ? "#dc2626"
                    : "#0f172a",
                }}
              >
                {card.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ==================================================
  // ISSUED BOOKS
  // ==================================================

  const renderIssuedBooks = () => {
    const rows =
      reportData?.issued_books || [];

    return (
      <>
        <ReportCount
          value={
            reportData?.total_issued_books ?? 0
          }
          label="Issued Book(s)"
        />

        <ReportTable
          rows={rows}
          columns={[
            {
              key: "issue_id",
              label: "Issue ID",
            },
            {
              key: "member",
              label: "Member",
              render: (row) =>
                row.member?.full_name ||
                row.member?.username ||
                `User ${row.member?.user_id}`,
            },
            {
              key: "book",
              label: "Book",
              render: (row) =>
                row.book?.title || "-",
            },
            {
              key: "issue_date",
              label: "Issue Date",
              render: (row) =>
                formatDate(row.issue_date),
            },
            {
              key: "due_date",
              label: "Due Date",
              render: (row) =>
                formatDate(row.due_date),
            },
            {
              key: "status",
              label: "Status",
              render: (row) =>
                renderStatus(row.status),
            },
          ]}
        />
      </>
    );
  };

  // ==================================================
  // OVERDUE BOOKS
  // ==================================================

  const renderOverdueBooks = () => {
    const rows =
      reportData?.overdue_books || [];

    return (
      <>
        <ReportCount
          value={
            reportData?.total_overdue_books ?? 0
          }
          label="Overdue Book(s)"
        />

        <ReportTable
          rows={rows}
          columns={[
            {
              key: "issue_id",
              label: "Issue ID",
            },
            {
              key: "member",
              label: "Member",
              render: (row) =>
                row.member?.full_name ||
                row.member?.username ||
                "-",
            },
            {
              key: "book",
              label: "Book",
              render: (row) =>
                row.book?.title || "-",
            },
            {
              key: "due_date",
              label: "Due Date",
              render: (row) =>
                formatDate(row.due_date),
            },
            {
              key: "overdue_days",
              label: "Overdue Days",
              render: (row) => (
                <span style={overdueBadgeStyle}>
                  {row.overdue_days ?? 0}
                </span>
              ),
            },
            {
              key: "current_fine",
              label: "Current Fine",
              render: (row) => (
                <span style={fineAmountStyle}>
                  {money(row.current_fine)}
                </span>
              ),
            },
          ]}
        />
      </>
    );
  };

  // ==================================================
  // FINES
  // ==================================================

  const renderFines = () => {
    const rows =
      reportData?.fine_records || [];

    return (
      <>
        <div style={miniSummaryGridStyle}>
          <MiniCard
            label="Fine Cases"
            value={
              reportData?.total_fine_cases ?? 0
            }
          />

          <MiniCard
            label="Generated"
            value={money(
              reportData?.total_fines_generated
            )}
          />

          <MiniCard
            label="Paid"
            value={money(
              reportData?.total_fines_paid
            )}
          />

          <MiniCard
            label="Outstanding"
            value={money(
              reportData?.total_fines_outstanding
            )}
            danger={
              Number(
                reportData?.total_fines_outstanding ||
                  0
              ) > 0
            }
          />
        </div>

        <ReportTable
          rows={rows}
          columns={[
            {
              key: "issue_id",
              label: "Issue ID",
            },
            {
              key: "username",
              label: "Member",
            },
            {
              key: "book_title",
              label: "Book",
            },
            {
              key: "fine_amount",
              label: "Fine",
              render: (row) => (
                <span style={fineAmountStyle}>
                  {money(row.fine_amount)}
                </span>
              ),
            },
            {
              key: "fine_status",
              label: "Status",
              render: (row) =>
                renderStatus(row.fine_status),
            },
            {
              key: "fine_paid_at",
              label: "Paid At",
              render: (row) =>
                formatDate(row.fine_paid_at),
            },
          ]}
        />
      </>
    );
  };

  // ==================================================
  // MOST BORROWED
  // ==================================================

  const renderMostBorrowed = () => {
    const rows =
      reportData?.most_borrowed_books || [];

    return (
      <>
        <ReportCount
          value={reportData?.total_books ?? 0}
          label="Book(s)"
        />

        <ReportTable
          rows={rows}
          columns={[
            {
              key: "book_id",
              label: "Book ID",
            },
            {
              key: "title",
              label: "Title",
            },
            {
              key: "isbn",
              label: "ISBN",
            },
            {
              key: "borrow_count",
              label: "Times Borrowed",
              render: (row) => (
                <span style={countNumberStyle}>
                  {row.borrow_count ?? 0}
                </span>
              ),
            },
          ]}
        />
      </>
    );
  };

  // ==================================================
  // RESERVATIONS
  // ==================================================

  const renderReservations = () => {
    const rows =
      reportData?.reservation_records || [];

    return (
      <>
        <ReportCount
          value={
            reportData?.total_reservations ?? 0
          }
          label="Reservation(s)"
        />

        <ReportTable
          rows={rows}
          columns={[
            {
              key: "reservation_id",
              label: "ID",
            },
            {
              key: "username",
              label: "Member",
            },
            {
              key: "book_title",
              label: "Book",
            },
            {
              key: "reserved_at",
              label: "Reserved At",
              render: (row) =>
                formatDate(row.reserved_at),
            },
            {
              key: "status",
              label: "Status",
              render: (row) =>
                renderStatus(row.status),
            },
            {
              key: "ready_until",
              label: "Ready Until",
              render: (row) =>
                formatDate(row.ready_until),
            },
          ]}
        />
      </>
    );
  };

  // ==================================================
  // MEMBER ACTIVITY
  // ==================================================

  const renderMemberActivity = () => {
    const rows =
      reportData?.member_activity || [];

    return (
      <>
        <ReportCount
          value={
            reportData?.total_users ?? 0
          }
          label="Member(s)"
        />

        <ReportTable
          rows={rows}
          columns={[
            {
              key: "user_id",
              label: "User ID",
            },
            {
              key: "full_name",
              label: "Member",
              render: (row) =>
                row.full_name ||
                row.username ||
                "-",
            },
            {
              key: "total_borrowed",
              label: "Borrowed",
            },
            {
              key: "currently_issued",
              label: "Current",
            },
            {
              key: "returned_books",
              label: "Returned",
            },
            {
              key: "total_fines",
              label: "Total Fines",
              render: (row) => (
                <span style={fineAmountStyle}>
                  {money(row.total_fines)}
                </span>
              ),
            },
          ]}
        />
      </>
    );
  };

  // ==================================================
  // ISSUE HISTORY
  // ==================================================

  const renderIssueHistory = () => {
    const rows =
      reportData?.issue_history || [];

    return (
      <>
        <ReportCount
          value={
            reportData?.total_issue_records ?? 0
          }
          label="Issue Record(s)"
        />

        <ReportTable
          rows={rows}
          columns={[
            {
              key: "issue_id",
              label: "ID",
            },
            {
              key: "member",
              label: "Member",
              render: (row) =>
                row.member?.full_name ||
                row.member?.username ||
                "-",
            },
            {
              key: "book",
              label: "Book",
              render: (row) =>
                row.book?.title || "-",
            },
            {
              key: "issue_date",
              label: "Issued",
              render: (row) =>
                formatDate(row.issue_date),
            },
            {
              key: "return_date",
              label: "Returned",
              render: (row) =>
                formatDate(row.return_date),
            },
            {
              key: "status",
              label: "Status",
              render: (row) =>
                renderStatus(row.status),
            },
            {
              key: "fine_amount",
              label: "Fine",
              render: (row) =>
                money(row.fine_amount),
            },
            {
              key: "renewal_count",
              label: "Renewals",
            },
          ]}
        />
      </>
    );
  };

  // ==================================================
  // REPORT BODY
  // ==================================================

  const renderReport = () => {
    switch (reportType) {
      case "summary":
        return renderSummary();

      case "issued-books":
        return renderIssuedBooks();

      case "overdue-books":
        return renderOverdueBooks();

      case "fines":
        return renderFines();

      case "most-borrowed-books":
        return renderMostBorrowed();

      case "reservations":
        return renderReservations();

      case "member-activity":
        return renderMemberActivity();

      case "issue-history":
        return renderIssueHistory();

      default:
        return null;
    }
  };

  // ==================================================
  // ACCESS
  // ==================================================

  if (!isStaff) {
    return (
      <div style={accessDeniedStyle}>
        <div style={accessIconStyle}>!</div>

        <div>
          <h2 style={accessTitleStyle}>
            Access Denied
          </h2>

          <p style={accessTextStyle}>
            Reports are available only to Admin
            and Librarian users.
          </p>
        </div>
      </div>
    );
  }

  // ==================================================
  // SELECTED REPORT
  // ==================================================

  const selectedLabel =
    reportOptions.find(
      (item) => item.value === reportType
    )?.label || "Reports";

  // ==================================================
  // PAGE
  // ==================================================

  return (
    <div style={pageStyle}>
      {/* PAGE HEADER */}

      <div style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>
            Reports
          </h1>

          <p style={subtitleStyle}>
            View operational and management
            reports for the library.
          </p>
        </div>

        <div style={staffBadgeStyle}>
          {isAdmin
            ? "Administrator"
            : "Librarian"}
        </div>
      </div>

      {/* REPORT CONTROLS */}

      <div style={controlsStyle}>
        <div style={controlFieldStyle}>
          <label style={labelStyle}>
            Report
          </label>

          <select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value);
              setStartDate("");
              setEndDate("");
            }}
            style={inputStyle}
          >
            {reportOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {supportsDateFilter && (
          <>
            <div style={controlFieldStyle}>
              <label style={labelStyle}>
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

            <div style={controlFieldStyle}>
              <label style={labelStyle}>
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

            <button
              onClick={handleApplyFilter}
              style={applyButtonStyle}
            >
              Apply
            </button>

            <button
              onClick={handleClearFilter}
              style={clearButtonStyle}
            >
              Clear
            </button>
          </>
        )}
      </div>

      {/* ERROR */}

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {/* REPORT CONTENT */}

      <div style={reportSectionStyle}>
        <div style={reportHeaderStyle}>
          <div>
            <h2 style={reportTitleStyle}>
              {selectedLabel}
            </h2>

            <p style={reportDescriptionStyle}>
              {getReportDescription(reportType)}
            </p>
          </div>

          <div style={reportHeaderActionsStyle}>
            {supportsDateFilter &&
              (startDate || endDate) && (
                <span style={filterActiveStyle}>
                  Date Filter Active
                </span>
              )}

            <button
              onClick={() => handleExport("pdf")}
              style={exportPdfButtonStyle}
              disabled={Boolean(exporting)}
            >
              {exporting === "pdf"
                ? "Exporting..."
                : "Export PDF"}
            </button>

            <button
              onClick={() => handleExport("excel")}
              style={exportExcelButtonStyle}
              disabled={Boolean(exporting)}
            >
              {exporting === "excel"
                ? "Exporting..."
                : "Export Excel"}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={loadingStyle}>
            <div style={loadingIconStyle}>
              ◷
            </div>

            Loading report...
          </div>
        ) : (
          renderReport()
        )}
      </div>
    </div>
  );
}

// ==================================================
// REPORT DESCRIPTION
// ==================================================

function getReportDescription(reportType) {
  switch (reportType) {
    case "summary":
      return "Overview of key library operational statistics.";

    case "issued-books":
      return "Books currently issued to library members.";

    case "overdue-books":
      return "Books that have exceeded their due dates.";

    case "fines":
      return "Generated, paid and outstanding fine information.";

    case "most-borrowed-books":
      return "Books ranked according to borrowing activity.";

    case "reservations":
      return "Reservation records and their current status.";

    case "member-activity":
      return "Borrowing and fine activity across library members.";

    case "issue-history":
      return "Complete historical record of book issues and returns.";

    default:
      return "";
  }
}

// ==================================================
// SMALL COMPONENTS
// ==================================================

function ReportCount({ value, label }) {
  return (
    <div style={countRowStyle}>
      <span style={countBadgeStyle}>
        {value} {label}
      </span>
    </div>
  );
}

function MiniCard({
  label,
  value,
  danger = false,
}) {
  return (
    <div style={miniCardStyle}>
      <div style={summaryLabelStyle}>
        {label}
      </div>

      <div
        style={{
          ...miniValueStyle,
          color: danger
            ? "#dc2626"
            : "#0f172a",
        }}
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

// ==================================================
// PAGE HEADER
// ==================================================

const pageHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
  flexWrap: "wrap",
  marginBottom: "20px",
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

const staffBadgeStyle = {
  padding: "6px 11px",
  backgroundColor: "#dbeafe",
  color: "#1d4ed8",
  borderRadius: "16px",
  fontSize: "11px",
  fontWeight: "700",
};

// ==================================================
// CONTROLS
// ==================================================

const controlsStyle = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-end",
  flexWrap: "wrap",

  backgroundColor: "#ffffff",

  padding: "15px 17px",

  borderRadius: "11px",

  marginBottom: "20px",

  border: "1px solid #e5e7eb",

  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const controlFieldStyle = {
  minWidth: "170px",
  flex: "1 1 170px",
};

const labelStyle = {
  display: "block",
  marginBottom: "5px",
  fontWeight: "600",
  color: "#475569",
  fontSize: "12px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: "7px",
  backgroundColor: "#ffffff",
  color: "#334155",
  fontSize: "12px",
  outline: "none",
};

const applyButtonStyle = {
  padding: "8px 13px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "12px",
  minHeight: "34px",
};

const clearButtonStyle = {
  padding: "8px 13px",
  backgroundColor: "#f1f5f9",
  color: "#475569",
  border: "1px solid #e2e8f0",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "12px",
  minHeight: "34px",
};

// ==================================================
// REPORT SECTION
// ==================================================

const reportSectionStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "17px",
  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",
};

const reportHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const reportTitleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
  fontWeight: "700",
};

const reportDescriptionStyle = {
  margin: "4px 0 0 0",
  color: "#64748b",
  fontSize: "12px",
};

const reportHeaderActionsStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const exportButtonBaseStyle = {
  padding: "8px 13px",
  border: "none",
  borderRadius: "7px",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "11px",
  minHeight: "34px",
};

const exportPdfButtonStyle = {
  ...exportButtonBaseStyle,
  backgroundColor: "#dc2626",
};

const exportExcelButtonStyle = {
  ...exportButtonBaseStyle,
  backgroundColor: "#15803d",
};

const filterActiveStyle = {
  backgroundColor: "#dcfce7",
  color: "#166534",
  padding: "5px 9px",
  borderRadius: "14px",
  fontSize: "10px",
  fontWeight: "700",
};

// ==================================================
// SUMMARY
// ==================================================

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "12px",
};

const summaryCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  backgroundColor: "#ffffff",
  padding: "14px 15px",
  borderRadius: "10px",
  border: "1px solid #e5e7eb",
  boxShadow:
    "0 2px 7px rgba(15,23,42,0.035)",
  minWidth: 0,
};

const summaryIconStyle = {
  width: "40px",
  height: "40px",
  minWidth: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "9px",
  fontSize: "16px",
  fontWeight: "700",
};

const summaryLabelStyle = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "600",
  lineHeight: "1.3",
};

const summaryValueStyle = {
  marginTop: "4px",
  fontSize: "20px",
  lineHeight: "1.15",
  fontWeight: "700",
};

// ==================================================
// MINI CARDS
// ==================================================

const miniSummaryGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "11px",
  marginBottom: "13px",
};

const miniCardStyle = {
  backgroundColor: "#f8fafc",
  padding: "12px 14px",
  borderRadius: "9px",
  border: "1px solid #e5e7eb",
};

const miniValueStyle = {
  marginTop: "4px",
  fontSize: "18px",
  fontWeight: "700",
};

// ==================================================
// TABLE
// ==================================================

const tableContainerStyle = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "9px",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "12px",
};

const headerRowStyle = {
  borderBottom: "1px solid #dbe2ea",
  textAlign: "left",
  backgroundColor: "#f8fafc",
};

const headerStyle = {
  padding: "9px 10px",
  color: "#475569",
  whiteSpace: "nowrap",
  fontSize: "11px",
  fontWeight: "700",
  textAlign: "left",
};

const rowStyle = {
  borderBottom: "1px solid #eef2f7",
  backgroundColor: "#ffffff",
};

const cellStyle = {
  padding: "9px 10px",
  color: "#475569",
  verticalAlign: "middle",
  lineHeight: "1.35",
};

const emptyStyle = {
  textAlign: "center",
  padding: "24px",
  color: "#64748b",
  fontSize: "12px",
};

// ==================================================
// BADGES
// ==================================================

const statusBadgeStyle = {
  display: "inline-block",
  padding: "3px 7px",
  borderRadius: "11px",
  fontSize: "10px",
  fontWeight: "700",
  whiteSpace: "nowrap",
};

const overdueBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "24px",
  padding: "3px 7px",
  borderRadius: "10px",
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  fontSize: "10px",
  fontWeight: "700",
};

const fineAmountStyle = {
  color: "#b45309",
  fontWeight: "700",
  whiteSpace: "nowrap",
};

const countNumberStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "25px",
  padding: "3px 7px",
  backgroundColor: "#dbeafe",
  color: "#1d4ed8",
  borderRadius: "10px",
  fontWeight: "700",
};

// ==================================================
// COUNT
// ==================================================

const countRowStyle = {
  display: "flex",
  justifyContent: "flex-end",
  marginBottom: "8px",
};

const countBadgeStyle = {
  backgroundColor: "#dbeafe",
  color: "#1d4ed8",
  padding: "5px 9px",
  borderRadius: "14px",
  fontWeight: "700",
  fontSize: "10px",
  whiteSpace: "nowrap",
};

// ==================================================
// ERROR
// ==================================================

const errorStyle = {
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  padding: "10px 12px",
  borderRadius: "7px",
  marginBottom: "18px",
  border: "1px solid #fecaca",
  fontSize: "12px",
};

// ==================================================
// LOADING
// ==================================================

const loadingStyle = {
  padding: "30px",
  color: "#64748b",
  textAlign: "center",
  fontSize: "13px",
};

const loadingIconStyle = {
  marginBottom: "5px",
  color: "#2563eb",
  fontSize: "18px",
};

// ==================================================
// ACCESS DENIED
// ==================================================

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

export default Reports;