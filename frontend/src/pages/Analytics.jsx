import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Analytics() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [topBorrowed, setTopBorrowed] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [activeMembers, setActiveMembers] = useState([]);
  const [trends, setTrends] = useState([]);

  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);
  const [error, setError] = useState("");

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
  // HEADERS
  // ==================================================

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem(
      "token"
    )}`,
  });

  // ==================================================
  // AUTH ERROR
  // ==================================================

  const handleAuthError = (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role_id");

      navigate("/");
      return true;
    }

    if (err.response?.status === 403) {
      setError("Admin access is required.");
      return true;
    }

    return false;
  };

  // ==================================================
  // FETCH ALL ANALYTICS
  // ==================================================

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const headers = getHeaders();

      const [
        dashboardResponse,
        borrowedResponse,
        ratedResponse,
        membersResponse,
        trendsResponse,
      ] = await Promise.all([
        axios.get(
          "http://127.0.0.1:8000/analytics/dashboard",
          { headers }
        ),

        axios.get(
          "http://127.0.0.1:8000/analytics/top-borrowed-books",
          {
            headers,
            params: { limit: 5 },
          }
        ),

        axios.get(
          "http://127.0.0.1:8000/analytics/top-rated-books",
          {
            headers,
            params: { limit: 5 },
          }
        ),

        axios.get(
          "http://127.0.0.1:8000/analytics/most-active-members",
          {
            headers,
            params: { limit: 5 },
          }
        ),

        axios.get(
          "http://127.0.0.1:8000/analytics/monthly-trends",
          {
            headers,
            params: { months: 6 },
          }
        ),
      ]);

      setDashboard(dashboardResponse.data);

      setTopBorrowed(
        borrowedResponse.data?.books || []
      );

      setTopRated(
        ratedResponse.data?.books || []
      );

      setActiveMembers(
        membersResponse.data?.members || []
      );

      setTrends(
        trendsResponse.data?.trends || []
      );
    } catch (err) {
      console.error("Analytics Error:", err);

      if (handleAuthError(err)) {
        return;
      }

      setError(
        err.response?.data?.detail ||
          "Unable to load analytics."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    } else {
      setLoading(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================================================
  // FETCH MONTHLY TRENDS
  // ==================================================

  const fetchMonthlyTrends = async (
    selectedMonths
  ) => {
    try {
      setTrendLoading(true);

      const response = await axios.get(
        "http://127.0.0.1:8000/analytics/monthly-trends",
        {
          headers: getHeaders(),
          params: {
            months: selectedMonths,
          },
        }
      );

      setTrends(
        response.data?.trends || []
      );
    } catch (err) {
      console.error(
        "Monthly Trends Error:",
        err
      );

      if (handleAuthError(err)) {
        return;
      }

      alert(
        err.response?.data?.detail ||
          "Unable to load monthly trends."
      );
    } finally {
      setTrendLoading(false);
    }
  };

  const handleMonthsChange = async (e) => {
    const value = Number(e.target.value);

    setMonths(value);

    await fetchMonthlyTrends(value);
  };

  // ==================================================
  // FORMAT MONEY
  // ==================================================

  const formatMoney = (value) => {
    return `₹${Number(value || 0).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  // ==================================================
  // STARS
  // ==================================================

  const renderStars = (value) => {
    const rating = Math.round(
      Number(value || 0)
    );

    return (
      <span style={starsStyle}>
        {"★".repeat(rating)}

        <span style={emptyStarsStyle}>
          {"★".repeat(
            Math.max(0, 5 - rating)
          )}
        </span>
      </span>
    );
  };

  // ==================================================
  // MAX TREND VALUE
  // ==================================================

  const maxTrendValue = Math.max(
    1,
    ...trends.flatMap((item) => [
      Number(item.issues || 0),
      Number(item.returns || 0),
    ])
  );

  // ==================================================
  // ACCESS CONTROL
  // ==================================================

  if (!isAdmin) {
    return (
      <div style={accessDeniedStyle}>
        <div style={accessIconStyle}>!</div>

        <div>
          <h2 style={accessTitleStyle}>
            Access Denied
          </h2>

          <p style={accessTextStyle}>
            Analytics is available only to
            the Administrator.
          </p>
        </div>
      </div>
    );
  }

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <div style={loadingStyle}>
        <div style={loadingIconStyle}>
          ◷
        </div>

        <div style={loadingTitleStyle}>
          Loading Analytics
        </div>

        <div style={loadingTextStyle}>
          Preparing library statistics
          and trends.
        </div>
      </div>
    );
  }

  // ==================================================
  // ERROR
  // ==================================================

  if (error && !dashboard) {
    return (
      <div style={errorStyle}>
        {error}
      </div>
    );
  }

  // ==================================================
  // DASHBOARD DATA
  // ==================================================

  const members =
    dashboard?.members || {};

  const books =
    dashboard?.books || {};

  const reservations =
    dashboard?.reservations || {};

  const fines =
    dashboard?.fines || {};

  const ratings =
    dashboard?.ratings || {};

  const monthly =
    dashboard?.monthly_activity || {};

  // ==================================================
  // PAGE
  // ==================================================

  return (
    <div style={pageStyle}>
      {/* HEADER */}

      <div style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>
            Library Analytics
          </h1>

          <p style={subtitleStyle}>
            Monitor library usage,
            borrowing activity, ratings,
            reservations and financial
            statistics.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          style={refreshButtonStyle}
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {/* OVERVIEW */}

      <SectionHeader
        title="Overview"
        description="Key operational metrics across the library."
      />

      <div style={cardGridStyle}>
        <StatCard
          title="Total Members"
          value={
            members.total_members || 0
          }
          icon="👥"
          background="#dbeafe"
        />

        <StatCard
          title="Book Titles"
          value={
            books.total_book_titles || 0
          }
          icon="📚"
          background="#ede9fe"
        />

        <StatCard
          title="Total Copies"
          value={
            books.total_copies || 0
          }
          icon="▤"
          background="#e0f2fe"
        />

        <StatCard
          title="Available Copies"
          value={
            books.available_copies || 0
          }
          icon="✓"
          background="#dcfce7"
        />

        <StatCard
          title="Issued Books"
          value={
            books.issued_books || 0
          }
          icon="📖"
          background="#fef3c7"
        />

        <StatCard
          title="Overdue Books"
          value={
            books.overdue_books || 0
          }
          icon="!"
          background="#fee2e2"
          danger={
            Number(
              books.overdue_books || 0
            ) > 0
          }
        />

        <StatCard
          title="Active Reservations"
          value={
            reservations.active || 0
          }
          icon="◷"
          background="#dbeafe"
        />

        <StatCard
          title="Ready for Pickup"
          value={
            reservations.ready_for_pickup ||
            0
          }
          icon="✓"
          background="#dcfce7"
        />
      </div>

      {/* FINE ANALYTICS */}

      <SectionHeader
        title="Fine Analytics"
        description="Financial summary of generated, paid and outstanding fines."
      />

      <div style={threeCardGridStyle}>
        <StatCard
          title="Fines Generated"
          value={formatMoney(
            fines.total_generated
          )}
          icon="₹"
          background="#ffedd5"
        />

        <StatCard
          title="Fines Paid"
          value={formatMoney(
            fines.paid
          )}
          icon="✓"
          background="#dcfce7"
        />

        <StatCard
          title="Outstanding Fines"
          value={formatMoney(
            fines.outstanding
          )}
          icon="!"
          background="#fee2e2"
          danger={
            Number(fines.outstanding || 0) >
            0
          }
        />
      </div>

      {/* RATINGS AND CURRENT MONTH */}

      <SectionHeader
        title="Ratings & Current Month"
        description="Reader ratings and current month circulation activity."
      />

      <div style={cardGridStyle}>
        <StatCard
          title="Total Ratings"
          value={
            ratings.total_ratings || 0
          }
          icon="★"
          background="#fef3c7"
        />

        <StatCard
          title="Average Rating"
          value={`${Number(
            ratings.average_rating || 0
          ).toFixed(2)} / 5`}
          icon="★"
          background="#fef3c7"
        />

        <StatCard
          title="Issues This Month"
          value={
            monthly.issues_this_month || 0
          }
          icon="↑"
          background="#dbeafe"
        />

        <StatCard
          title="Returns This Month"
          value={
            monthly.returns_this_month || 0
          }
          icon="↓"
          background="#dcfce7"
        />
      </div>

      {/* TOP BORROWED + TOP RATED */}

      <div style={twoColumnGridStyle}>
        {/* TOP BORROWED */}

        <div style={sectionCardStyle}>
          <div style={sectionCardHeaderStyle}>
            <div>
              <h2 style={cardTitleStyle}>
                Top Borrowed Books
              </h2>

              <p style={cardSubtitleStyle}>
                Most frequently borrowed
                titles.
              </p>
            </div>

            <span style={listBadgeStyle}>
              Top 5
            </span>
          </div>

          <div style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeaderRowStyle}>
                  <th style={thStyle}>
                    Rank
                  </th>

                  <th style={thStyle}>
                    Book
                  </th>

                  <th style={thStyle}>
                    Borrows
                  </th>
                </tr>
              </thead>

              <tbody>
                {topBorrowed.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan="3"
                      style={emptyCellStyle}
                    >
                      No borrowing data.
                    </td>
                  </tr>
                ) : (
                  topBorrowed.map(
                    (book, index) => (
                      <tr
                        key={book.book_id}
                        style={tableRowStyle}
                      >
                        <td style={tdStyle}>
                          <span
                            style={
                              rankBadgeStyle
                            }
                          >
                            #{index + 1}
                          </span>
                        </td>

                        <td
                          style={
                            bookTitleCellStyle
                          }
                        >
                          {book.title}

                          <div
                            style={
                              smallTextStyle
                            }
                          >
                            ID:{" "}
                            {book.book_id}
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <span
                            style={
                              numberBadgeStyle
                            }
                          >
                            {
                              book.borrow_count
                            }
                          </span>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOP RATED */}

        <div style={sectionCardStyle}>
          <div style={sectionCardHeaderStyle}>
            <div>
              <h2 style={cardTitleStyle}>
                Top Rated Books
              </h2>

              <p style={cardSubtitleStyle}>
                Highest rated books from
                reader feedback.
              </p>
            </div>

            <span style={listBadgeStyle}>
              Top 5
            </span>
          </div>

          <div style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeaderRowStyle}>
                  <th style={thStyle}>
                    Rank
                  </th>

                  <th style={thStyle}>
                    Book
                  </th>

                  <th style={thStyle}>
                    Rating
                  </th>
                </tr>
              </thead>

              <tbody>
                {topRated.length === 0 ? (
                  <tr>
                    <td
                      colSpan="3"
                      style={emptyCellStyle}
                    >
                      No rating data.
                    </td>
                  </tr>
                ) : (
                  topRated.map(
                    (book, index) => (
                      <tr
                        key={book.book_id}
                        style={tableRowStyle}
                      >
                        <td style={tdStyle}>
                          <span
                            style={
                              rankBadgeStyle
                            }
                          >
                            #{index + 1}
                          </span>
                        </td>

                        <td
                          style={
                            bookTitleCellStyle
                          }
                        >
                          {book.title}

                          <div
                            style={
                              smallTextStyle
                            }
                          >
                            {
                              book.rating_count
                            }{" "}
                            rating(s)
                          </div>
                        </td>

                        <td style={tdStyle}>
                          <div
                            style={
                              ratingCellStyle
                            }
                          >
                            <div>
                              {renderStars(
                                book.average_rating
                              )}
                            </div>

                            <strong>
                              {Number(
                                book.average_rating ||
                                  0
                              ).toFixed(2)}
                            </strong>
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ACTIVE MEMBERS */}

      <div style={sectionCardStyle}>
        <div style={sectionCardHeaderStyle}>
          <div>
            <h2 style={cardTitleStyle}>
              Most Active Members
            </h2>

            <p style={cardSubtitleStyle}>
              Members ranked by borrowing
              activity.
            </p>
          </div>

          <span style={listBadgeStyle}>
            Top 5
          </span>
        </div>

        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeaderRowStyle}>
                <th style={thStyle}>
                  Rank
                </th>

                <th style={thStyle}>
                  User ID
                </th>

                <th style={thStyle}>
                  Username
                </th>

                <th style={thStyle}>
                  Full Name
                </th>

                <th style={thStyle}>
                  Books Borrowed
                </th>
              </tr>
            </thead>

            <tbody>
              {activeMembers.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={emptyCellStyle}
                  >
                    No member activity
                    data.
                  </td>
                </tr>
              ) : (
                activeMembers.map(
                  (member, index) => (
                    <tr
                      key={member.user_id}
                      style={tableRowStyle}
                    >
                      <td style={tdStyle}>
                        <span
                          style={
                            rankBadgeStyle
                          }
                        >
                          #{index + 1}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        {member.user_id}
                      </td>

                      <td
                        style={
                          usernameCellStyle
                        }
                      >
                        {member.username}
                      </td>

                      <td style={tdStyle}>
                        {member.full_name ||
                          "-"}
                      </td>

                      <td style={tdStyle}>
                        <span
                          style={
                            numberBadgeStyle
                          }
                        >
                          {
                            member.borrow_count
                          }
                        </span>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MONTHLY TRENDS */}

      <div style={sectionCardStyle}>
        <div style={trendHeaderStyle}>
          <div>
            <h2 style={cardTitleStyle}>
              Monthly Borrowing Trends
            </h2>

            <p style={cardSubtitleStyle}>
              Compare issues and returns
              over time.
            </p>
          </div>

          <div style={periodControlStyle}>
            <label style={monthsLabelStyle}>
              Period
            </label>

            <select
              value={months}
              onChange={
                handleMonthsChange
              }
              style={monthsSelectStyle}
              disabled={trendLoading}
            >
              <option value={3}>
                Last 3 Months
              </option>

              <option value={6}>
                Last 6 Months
              </option>

              <option value={12}>
                Last 12 Months
              </option>

              <option value={24}>
                Last 24 Months
              </option>
            </select>
          </div>
        </div>

        {/* LEGEND */}

        <div style={trendLegendStyle}>
          <div style={legendItemStyle}>
            <span
              style={{
                ...legendDotStyle,
                backgroundColor:
                  "#2563eb",
              }}
            />
            Issues
          </div>

          <div style={legendItemStyle}>
            <span
              style={{
                ...legendDotStyle,
                backgroundColor:
                  "#16a34a",
              }}
            />
            Returns
          </div>
        </div>

        {trendLoading ? (
          <div style={emptyCellStyle}>
            Loading trends...
          </div>
        ) : trends.length === 0 ? (
          <div style={emptyCellStyle}>
            No monthly trend data.
          </div>
        ) : (
          <div style={trendContainerStyle}>
            {trends.map((item) => {
              const issueWidth =
                (Number(
                  item.issues || 0
                ) /
                  maxTrendValue) *
                100;

              const returnWidth =
                (Number(
                  item.returns || 0
                ) /
                  maxTrendValue) *
                100;

              return (
                <div
                  key={item.month}
                  style={monthBlockStyle}
                >
                  <div
                    style={
                      monthLabelStyle
                    }
                  >
                    {item.month}
                  </div>

                  {/* ISSUES */}

                  <div style={trendRowStyle}>
                    <span
                      style={trendNameStyle}
                    >
                      Issues
                    </span>

                    <div
                      style={
                        barBackgroundStyle
                      }
                    >
                      <div
                        style={{
                          ...issueBarStyle,
                          width: `${issueWidth}%`,
                        }}
                      />
                    </div>

                    <strong
                      style={
                        trendValueStyle
                      }
                    >
                      {item.issues}
                    </strong>
                  </div>

                  {/* RETURNS */}

                  <div style={trendRowStyle}>
                    <span
                      style={trendNameStyle}
                    >
                      Returns
                    </span>

                    <div
                      style={
                        barBackgroundStyle
                      }
                    >
                      <div
                        style={{
                          ...returnBarStyle,
                          width: `${returnWidth}%`,
                        }}
                      />
                    </div>

                    <strong
                      style={
                        trendValueStyle
                      }
                    >
                      {item.returns}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================================================
// SECTION HEADER
// ==================================================

function SectionHeader({
  title,
  description,
}) {
  return (
    <div style={sectionHeaderStyle}>
      <h2 style={sectionTitleStyle}>
        {title}
      </h2>

      <p style={sectionDescriptionStyle}>
        {description}
      </p>
    </div>
  );
}

// ==================================================
// STAT CARD
// ==================================================

function StatCard({
  title,
  value,
  icon,
  background,
  danger = false,
}) {
  return (
    <div style={statCardStyle}>
      <div
        style={{
          ...statIconStyle,
          backgroundColor: background,
        }}
      >
        {icon}
      </div>

      <div>
        <div style={statTitleStyle}>
          {title}
        </div>

        <div
          style={{
            ...statValueStyle,
            color: danger
              ? "#dc2626"
              : "#0f172a",
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
  maxWidth: "100%",
  boxSizing: "border-box",
};

// HEADER

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
  lineHeight: "1.45",
};

const refreshButtonStyle = {
  padding: "9px 14px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "12px",
};

// SECTION HEADER

const sectionHeaderStyle = {
  marginTop: "22px",
  marginBottom: "11px",
};

const sectionTitleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "19px",
  fontWeight: "700",
};

const sectionDescriptionStyle = {
  margin: "3px 0 0 0",
  color: "#64748b",
  fontSize: "11px",
};

// STAT CARDS

const cardGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "12px",
};

const threeCardGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "12px",
};

const statCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",

  backgroundColor: "#ffffff",

  padding: "14px 15px",

  borderRadius: "10px",

  border: "1px solid #e5e7eb",

  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",

  minWidth: 0,
};

const statIconStyle = {
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

const statValueStyle = {
  marginTop: "3px",

  fontSize: "20px",

  fontWeight: "700",

  lineHeight: "1.1",
};

const statTitleStyle = {
  color: "#64748b",

  fontSize: "11px",

  fontWeight: "600",
};

// TWO COLUMNS

const twoColumnGridStyle = {
  display: "grid",

  gridTemplateColumns:
    "repeat(auto-fit, minmax(360px, 1fr))",

  gap: "14px",

  marginTop: "22px",
};

// SECTION CARDS

const sectionCardStyle = {
  backgroundColor: "#ffffff",

  padding: "16px",

  borderRadius: "11px",

  border: "1px solid #e5e7eb",

  boxShadow:
    "0 3px 10px rgba(15,23,42,0.04)",

  marginTop: "18px",

  boxSizing: "border-box",
};

const sectionCardHeaderStyle = {
  display: "flex",

  justifyContent: "space-between",

  alignItems: "center",

  gap: "12px",

  marginBottom: "11px",
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

const listBadgeStyle = {
  backgroundColor: "#dbeafe",

  color: "#1d4ed8",

  padding: "4px 8px",

  borderRadius: "12px",

  fontSize: "10px",

  fontWeight: "700",

  whiteSpace: "nowrap",
};

// TABLE

const tableContainerStyle = {
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

  padding: "9px 10px",

  color: "#475569",

  whiteSpace: "nowrap",

  fontSize: "11px",

  fontWeight: "700",
};

const tdStyle = {
  padding: "9px 10px",

  borderBottom: "1px solid #eef2f7",

  verticalAlign: "middle",

  color: "#475569",

  lineHeight: "1.35",
};

const bookTitleCellStyle = {
  ...tdStyle,

  color: "#1e293b",

  fontWeight: "600",
};

const usernameCellStyle = {
  ...tdStyle,

  color: "#1e293b",

  fontWeight: "600",
};

const tableRowStyle = {
  backgroundColor: "#ffffff",
};

const emptyCellStyle = {
  padding: "24px",

  textAlign: "center",

  color: "#64748b",

  fontSize: "12px",
};

const rankBadgeStyle = {
  backgroundColor: "#dbeafe",

  color: "#1d4ed8",

  padding: "3px 7px",

  borderRadius: "10px",

  fontWeight: "700",

  fontSize: "10px",

  whiteSpace: "nowrap",
};

const numberBadgeStyle = {
  display: "inline-flex",

  minWidth: "24px",

  justifyContent: "center",

  backgroundColor: "#f1f5f9",

  color: "#334155",

  padding: "3px 7px",

  borderRadius: "10px",

  fontWeight: "700",

  fontSize: "10px",
};

const smallTextStyle = {
  fontSize: "10px",

  color: "#94a3b8",

  marginTop: "2px",

  fontWeight: "400",
};

// RATINGS

const starsStyle = {
  color: "#f59e0b",

  whiteSpace: "nowrap",

  fontSize: "11px",

  letterSpacing: "1px",
};

const emptyStarsStyle = {
  color: "#d1d5db",
};

const ratingCellStyle = {
  display: "flex",

  flexDirection: "column",

  gap: "2px",
};

// TREND HEADER

const trendHeaderStyle = {
  display: "flex",

  justifyContent: "space-between",

  alignItems: "center",

  gap: "15px",

  flexWrap: "wrap",

  marginBottom: "10px",
};

const periodControlStyle = {
  display: "flex",

  alignItems: "center",

  gap: "7px",
};

const monthsLabelStyle = {
  color: "#475569",

  fontWeight: "600",

  fontSize: "11px",
};

const monthsSelectStyle = {
  padding: "7px 9px",

  border: "1px solid #d1d5db",

  borderRadius: "7px",

  backgroundColor: "#ffffff",

  color: "#334155",

  fontSize: "11px",
};

// TREND LEGEND

const trendLegendStyle = {
  display: "flex",

  gap: "14px",

  marginBottom: "8px",

  paddingBottom: "9px",

  borderBottom: "1px solid #eef2f7",
};

const legendItemStyle = {
  display: "flex",

  alignItems: "center",

  gap: "5px",

  color: "#64748b",

  fontSize: "10px",

  fontWeight: "600",
};

const legendDotStyle = {
  width: "7px",

  height: "7px",

  borderRadius: "50%",
};

// TRENDS

const trendContainerStyle = {
  marginTop: "4px",
};

const monthBlockStyle = {
  padding: "11px 0",

  borderBottom: "1px solid #eef2f7",
};

const monthLabelStyle = {
  color: "#334155",

  fontWeight: "700",

  marginBottom: "7px",

  fontSize: "11px",
};

const trendRowStyle = {
  display: "grid",

  gridTemplateColumns:
    "55px 1fr 35px",

  gap: "8px",

  alignItems: "center",

  marginTop: "6px",
};

const trendNameStyle = {
  fontSize: "10px",

  color: "#64748b",
};

const barBackgroundStyle = {
  height: "7px",

  backgroundColor: "#e5e7eb",

  borderRadius: "10px",

  overflow: "hidden",
};

const issueBarStyle = {
  height: "100%",

  backgroundColor: "#2563eb",

  borderRadius: "10px",

  minWidth: "2px",
};

const returnBarStyle = {
  height: "100%",

  backgroundColor: "#16a34a",

  borderRadius: "10px",

  minWidth: "2px",
};

const trendValueStyle = {
  textAlign: "right",

  color: "#334155",

  fontSize: "10px",
};

// LOADING

const loadingStyle = {
  backgroundColor: "#ffffff",

  padding: "36px",

  textAlign: "center",

  borderRadius: "11px",

  border: "1px solid #e5e7eb",
};

const loadingIconStyle = {
  color: "#2563eb",

  fontSize: "20px",

  marginBottom: "7px",
};

const loadingTitleStyle = {
  color: "#111827",

  fontSize: "15px",

  fontWeight: "700",
};

const loadingTextStyle = {
  color: "#64748b",

  fontSize: "12px",

  marginTop: "3px",
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

export default Analytics;