import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const [data, setData] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // ================================================
  // TOKEN
  // ================================================

  const getToken = () => {
    return localStorage.getItem("token");
  };

  const getHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
  });

  // ================================================
  // LOGOUT
  // ================================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role_id");

    navigate("/");
  };

  // ================================================
  // LOAD DASHBOARD
  // ================================================

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const token = getToken();

        if (!token) {
          navigate("/");
          return;
        }

        // Get logged-in admin
        const userResponse = await axios.get(
          "http://127.0.0.1:8000/users/me",
          {
            headers: getHeaders(),
          }
        );

        const currentUser = userResponse.data;

        setUser(currentUser);

        // ADMIN role_id = 2
        if (Number(currentUser.role_id) !== 2) {
          if (Number(currentUser.role_id) === 3) {
            navigate("/librarian-dashboard");
          } else if (Number(currentUser.role_id) === 4) {
            navigate("/member-dashboard");
          } else {
            handleLogout();
          }

          return;
        }

        // Admin analytics dashboard
        const response = await axios.get(
          "http://127.0.0.1:8000/analytics/dashboard",
          {
            headers: getHeaders(),
          }
        );

        setData(response.data);
      } catch (error) {
        console.error(
          "Admin Dashboard Error:",
          error
        );

        if (
          error.response?.status === 401 ||
          error.response?.status === 403
        ) {
          handleLogout();
          return;
        }

        setError(
          error.response?.data?.detail ||
            "Unable to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // ================================================
  // LOADING
  // ================================================

  if (loading) {
    return (
      <div style={loadingStyle}>
        Loading admin dashboard...
      </div>
    );
  }

  // ================================================
  // PAGE
  // ================================================

  return (
    <div style={pageStyle}>
      {/* HEADER */}

      <div style={headerStyle}>
        <h1 style={titleStyle}>
          Admin Dashboard
        </h1>

        <p style={subtitleStyle}>
          Smart Library Management System overview
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {/* WELCOME */}

      {user && (
        <div style={welcomeCardStyle}>
          <div style={welcomeLeftStyle}>
            <div style={avatarStyle}>
              🛡️
            </div>

            <div>
              <div style={welcomeSmallStyle}>
                Welcome back,
              </div>

              <h2 style={welcomeNameStyle}>
                {user.full_name || user.username}
              </h2>

              <div style={userDetailsStyle}>
                <span>
                  <strong>Username:</strong>{" "}
                  {user.username}
                </span>

                <span style={dividerStyle}>
                  |
                </span>

                <span>
                  <strong>Email:</strong>{" "}
                  {user.email || "-"}
                </span>
              </div>
            </div>
          </div>

          <div style={adminBadgeStyle}>
            🛡 ADMINISTRATOR
          </div>
        </div>
      )}

      {data && (
        <>
          {/* MAIN SUMMARY */}

          <div style={metricsGridStyle}>
            <MetricCard
              icon="👥"
              iconBackground="#dbeafe"
              title="Total Members"
              value={data.members?.total_members ?? 0}
              description="Registered library members"
            />

            <MetricCard
              icon="📚"
              iconBackground="#dcfce7"
              title="Book Titles"
              value={data.books?.total_book_titles ?? 0}
              description="Total titles in the catalog"
            />

            <MetricCard
              icon="📦"
              iconBackground="#ede9fe"
              title="Total Copies"
              value={data.books?.total_copies ?? 0}
              description="All physical book copies"
            />

            <MetricCard
              icon="✓"
              iconBackground="#dcfce7"
              title="Available Copies"
              value={data.books?.available_copies ?? 0}
              description="Copies currently available"
            />

            <MetricCard
              icon="📖"
              iconBackground="#dbeafe"
              title="Issued Books"
              value={data.books?.issued_books ?? 0}
              description="Books currently borrowed"
            />

            <MetricCard
              icon="⏰"
              iconBackground="#fee2e2"
              title="Overdue Books"
              value={data.books?.overdue_books ?? 0}
              description="Books past their due date"
            />
          </div>

          {/* RESERVATION + FINE SUMMARY */}

          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>
              Library Operations
            </h2>

            <p style={sectionSubtitleStyle}>
              Reservations, fines and member activity
            </p>
          </div>

          <div style={operationsGridStyle}>
            <MetricCard
              icon="🔖"
              iconBackground="#ede9fe"
              title="Active Reservations"
              value={data.reservations?.active ?? 0}
              description="Reservations waiting in queue"
            />

            <MetricCard
              icon="📦"
              iconBackground="#ffedd5"
              title="Ready for Pickup"
              value={
                data.reservations?.ready_for_pickup ?? 0
              }
              description="Reserved books ready for collection"
            />

            <MetricCard
              icon="₹"
              iconBackground="#fef3c7"
              title="Total Fines"
              value={`₹${data.fines?.total_generated ?? 0}`}
              description="Total fines generated"
            />

            <MetricCard
              icon="✓"
              iconBackground="#dcfce7"
              title="Paid Fines"
              value={`₹${data.fines?.paid ?? 0}`}
              description="Fine amount already collected"
            />

            <MetricCard
              icon="!"
              iconBackground="#fee2e2"
              title="Outstanding Fines"
              value={`₹${data.fines?.outstanding ?? 0}`}
              description="Fine amount still unpaid"
            />

            <MetricCard
              icon="★"
              iconBackground="#fef3c7"
              title="Average Rating"
              value={data.ratings?.average_rating ?? 0}
              description="Average rating across books"
            />
          </div>

          {/* ACTIVITY */}

          <div style={activityCardStyle}>
            <div style={activityHeaderStyle}>
              <div>
                <h2 style={quickActionsTitleStyle}>
                  Monthly Activity
                </h2>

                <p style={quickActionsSubtitleStyle}>
                  Current month circulation summary
                </p>
              </div>

              <button
                style={analyticsButtonStyle}
                onClick={() =>
                  navigate("/analytics")
                }
              >
                View Analytics
              </button>
            </div>

            <div style={activityGridStyle}>
              <SmallStat
                label="Issues This Month"
                value={
                  data.monthly_activity
                    ?.issues_this_month ?? 0
                }
              />

              <SmallStat
                label="Returns This Month"
                value={
                  data.monthly_activity
                    ?.returns_this_month ?? 0
                }
              />

              <SmallStat
                label="Total Ratings"
                value={
                  data.ratings?.total_ratings ?? 0
                }
              />
            </div>
          </div>

          {/* QUICK ACTIONS */}

          <div style={quickActionsCardStyle}>
            <div style={quickActionsHeaderStyle}>
              <h2 style={quickActionsTitleStyle}>
                Quick Actions
              </h2>

              <p style={quickActionsSubtitleStyle}>
                Access frequently used administration tools
              </p>
            </div>

            <div style={quickActionsButtonsStyle}>
              <ActionButton
                primary
                label="👥 Manage Users"
                onClick={() =>
                  navigate("/users")
                }
              />

              <ActionButton
                label="📚 Manage Books"
                onClick={() =>
                  navigate("/books")
                }
              />

              <ActionButton
                label="📖 Issues"
                onClick={() =>
                  navigate("/issues")
                }
              />

              <ActionButton
                label="🔖 Reservations"
                onClick={() =>
                  navigate("/reservations")
                }
              />

              <ActionButton
                label="₹ Fines"
                onClick={() =>
                  navigate("/fines")
                }
              />

              <ActionButton
                label="📊 Reports"
                onClick={() =>
                  navigate("/reports")
                }
              />

              <ActionButton
                label="📈 Analytics"
                onClick={() =>
                  navigate("/analytics")
                }
              />

              <ActionButton
                label="☷ Audit Logs"
                onClick={() =>
                  navigate("/audit-logs")
                }
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ================================================
// METRIC CARD
// ================================================

function MetricCard({
  icon,
  iconBackground,
  title,
  value,
  description,
}) {
  return (
    <div style={metricCardStyle}>
      <div
        style={{
          ...metricIconStyle,
          backgroundColor: iconBackground,
        }}
      >
        {icon}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={metricTitleStyle}>
          {title}
        </div>

        <div style={metricValueStyle}>
          {value}
        </div>

        <div style={metricDescriptionStyle}>
          {description}
        </div>
      </div>
    </div>
  );
}

// ================================================
// SMALL STAT
// ================================================

function SmallStat({ label, value }) {
  return (
    <div style={smallStatStyle}>
      <div style={smallStatLabelStyle}>
        {label}
      </div>

      <div style={smallStatValueStyle}>
        {value}
      </div>
    </div>
  );
}

// ================================================
// ACTION BUTTON
// ================================================

function ActionButton({
  label,
  onClick,
  primary = false,
}) {
  const [hovered, setHovered] =
    useState(false);

  const style = primary
    ? {
        ...actionButtonBaseStyle,
        backgroundColor: hovered
          ? "#1d4ed8"
          : "#2563eb",
        color: "#ffffff",
        border: "1px solid #2563eb",
      }
    : {
        ...actionButtonBaseStyle,
        backgroundColor: hovered
          ? "#eff6ff"
          : "#ffffff",
        color: "#2563eb",
        border: "1px solid #93c5fd",
      };

  return (
    <button
      style={style}
      onClick={onClick}
      onMouseEnter={() =>
        setHovered(true)
      }
      onMouseLeave={() =>
        setHovered(false)
      }
    >
      {label}
    </button>
  );
}

// ================================================
// STYLES
// ================================================

const pageStyle = {
  width: "100%",
  boxSizing: "border-box",
};

const headerStyle = {
  marginBottom: "24px",
};

const titleStyle = {
  margin: 0,
  fontSize: "36px",
  fontWeight: "700",
  color: "#111827",
};

const subtitleStyle = {
  margin: "6px 0 0 0",
  color: "#6b7280",
  fontSize: "15px",
};

// WELCOME

const welcomeCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",

  backgroundColor: "#ffffff",

  padding: "22px 26px",

  borderRadius: "14px",

  border: "1px solid #e5e7eb",

  boxShadow:
    "0 4px 14px rgba(15, 23, 42, 0.05)",

  marginBottom: "26px",
};

const welcomeLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
};

const avatarStyle = {
  width: "66px",
  height: "66px",

  borderRadius: "50%",

  backgroundColor: "#eff6ff",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  fontSize: "29px",
};

const welcomeSmallStyle = {
  color: "#475569",

  fontSize: "14px",
  fontWeight: "600",

  marginBottom: "4px",
};

const welcomeNameStyle = {
  margin: "0 0 9px 0",

  color: "#111827",

  fontSize: "24px",
  fontWeight: "700",
};

const userDetailsStyle = {
  display: "flex",
  flexWrap: "wrap",

  gap: "10px",

  color: "#64748b",

  fontSize: "13px",
};

const dividerStyle = {
  color: "#cbd5e1",
};

const adminBadgeStyle = {
  padding: "9px 16px",

  borderRadius: "22px",

  backgroundColor: "#eff6ff",
  color: "#2563eb",

  border: "1px solid #bfdbfe",

  fontSize: "12px",
  fontWeight: "700",
};

// METRICS

const metricsGridStyle = {
  display: "grid",

  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",

  gap: "18px",

  marginBottom: "28px",
};

const operationsGridStyle = {
  display: "grid",

  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",

  gap: "18px",

  marginBottom: "28px",
};

const metricCardStyle = {
  backgroundColor: "#ffffff",

  minHeight: "112px",

  padding: "19px",

  borderRadius: "12px",

  border: "1px solid #e5e7eb",

  boxShadow:
    "0 4px 12px rgba(15, 23, 42, 0.05)",

  display: "flex",

  alignItems: "flex-start",

  gap: "15px",

  boxSizing: "border-box",
};

const metricIconStyle = {
  width: "52px",
  height: "52px",

  minWidth: "52px",

  borderRadius: "12px",

  display: "flex",

  alignItems: "center",

  justifyContent: "center",

  fontSize: "23px",
};

const metricTitleStyle = {
  color: "#475569",

  fontSize: "13px",

  fontWeight: "600",

  marginBottom: "7px",
};

const metricValueStyle = {
  color: "#0f172a",

  fontSize: "28px",

  fontWeight: "700",

  lineHeight: "1",

  marginBottom: "7px",
};

const metricDescriptionStyle = {
  color: "#94a3b8",

  fontSize: "11px",

  lineHeight: "1.4",
};

// SECTION TITLE

const sectionHeaderStyle = {
  marginBottom: "14px",
};

const sectionTitleStyle = {
  margin: 0,

  color: "#111827",

  fontSize: "20px",

  fontWeight: "700",
};

const sectionSubtitleStyle = {
  margin: "5px 0 0 0",

  color: "#64748b",

  fontSize: "13px",
};

// MONTHLY ACTIVITY

const activityCardStyle = {
  backgroundColor: "#ffffff",

  padding: "20px",

  borderRadius: "12px",

  border: "1px solid #e5e7eb",

  boxShadow:
    "0 4px 12px rgba(15, 23, 42, 0.04)",

  marginBottom: "26px",
};

const activityHeaderStyle = {
  display: "flex",

  alignItems: "center",

  justifyContent: "space-between",

  gap: "20px",

  marginBottom: "17px",
};

const activityGridStyle = {
  display: "grid",

  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",

  gap: "14px",
};

const smallStatStyle = {
  backgroundColor: "#f8fafc",

  padding: "16px 18px",

  borderRadius: "10px",

  border: "1px solid #e2e8f0",
};

const smallStatLabelStyle = {
  color: "#64748b",

  fontSize: "12px",

  fontWeight: "600",

  marginBottom: "8px",
};

const smallStatValueStyle = {
  color: "#0f172a",

  fontSize: "25px",

  fontWeight: "700",
};

const analyticsButtonStyle = {
  padding: "9px 15px",

  borderRadius: "7px",

  border: "1px solid #bfdbfe",

  backgroundColor: "#eff6ff",

  color: "#2563eb",

  cursor: "pointer",

  fontSize: "13px",

  fontWeight: "600",
};

// QUICK ACTIONS

const quickActionsCardStyle = {
  backgroundColor: "#ffffff",

  padding: "22px",

  borderRadius: "12px",

  border: "1px solid #e5e7eb",

  boxShadow:
    "0 4px 12px rgba(15, 23, 42, 0.04)",
};

const quickActionsHeaderStyle = {
  marginBottom: "16px",
};

const quickActionsTitleStyle = {
  margin: 0,

  color: "#111827",

  fontSize: "20px",

  fontWeight: "700",
};

const quickActionsSubtitleStyle = {
  margin: "5px 0 0 0",

  color: "#64748b",

  fontSize: "13px",
};

const quickActionsButtonsStyle = {
  display: "grid",

  gridTemplateColumns:
    "repeat(4, minmax(140px, 1fr))",

  gap: "12px",
};

const actionButtonBaseStyle = {
  padding: "12px 14px",

  borderRadius: "8px",

  cursor: "pointer",

  fontSize: "13px",

  fontWeight: "600",

  transition: "all 0.2s ease",
};

// MESSAGES

const loadingStyle = {
  padding: "40px",

  textAlign: "center",

  color: "#6b7280",

  fontSize: "16px",
};

const errorStyle = {
  backgroundColor: "#fee2e2",

  color: "#991b1b",

  padding: "12px 15px",

  borderRadius: "8px",

  marginBottom: "20px",

  border: "1px solid #fecaca",
};

export default Dashboard;