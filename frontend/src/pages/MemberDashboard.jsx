import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function MemberDashboard() {
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const getToken = () => localStorage.getItem("token");

  const getHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
  });

  useEffect(() => {
    fetchMemberDashboard();
  }, []);

  const fetchMemberDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        navigate("/");
        return;
      }

      const userResponse = await axios.get(
        "http://127.0.0.1:8000/users/me",
        {
          headers: getHeaders(),
        }
      );

      setUser(userResponse.data);

      const summaryResponse = await axios.get(
        "http://127.0.0.1:8000/issues/me/summary",
        {
          headers: getHeaders(),
        }
      );

      setSummary(summaryResponse.data);
    } catch (error) {
      console.error("Member Dashboard Error:", error);

      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role_id");

        navigate("/");
        return;
      }

      setError(
        error.response?.data?.detail ||
          "Unable to load member dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={loadingStyle}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* HEADER */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          Member Dashboard
        </h1>

        <p style={subtitleStyle}>
          Overview of your library activity
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {/* WELCOME CARD */}
      {user && (
        <div style={welcomeCardStyle}>
          <div style={welcomeLeftStyle}>
            <div style={avatarStyle}>
              👤
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
                  {user.email}
                </span>
              </div>
            </div>
          </div>

          <div style={memberBadgeStyle}>
            👤 MEMBER
          </div>
        </div>
      )}

      {/* METRIC CARDS */}
      <div style={metricsGridStyle}>
        <MetricCard
          icon="📖"
          iconBackground="#dcfce7"
          title="Active Books"
          value={summary?.active_books ?? 0}
          description="Currently borrowed books"
        />

        <MetricCard
          icon="📄"
          iconBackground="#dbeafe"
          title="Total Issue Records"
          value={summary?.total_issue_records ?? 0}
          description="Your complete borrowing history"
        />

        <MetricCard
          icon="🔖"
          iconBackground="#ede9fe"
          title="Total Reservations"
          value={summary?.total_reservations ?? 0}
          description="All reservations made"
        />

        <MetricCard
          icon="🔖"
          iconBackground="#ffedd5"
          title="Active Reservations"
          value={summary?.active_reservations ?? 0}
          description="Reservations currently active"
        />

        <MetricCard
          icon="₹"
          iconBackground="#fee2e2"
          title="Total Fines"
          value={`₹${summary?.total_fines ?? 0}`}
          description="Total fine amount"
        />
      </div>

      {/* QUICK ACTIONS */}
      <div style={quickActionsCardStyle}>
        <div style={quickActionsHeaderStyle}>
          <h2 style={quickActionsTitleStyle}>
            Quick Actions
          </h2>

          <p style={quickActionsSubtitleStyle}>
            Access frequently used library services
          </p>
        </div>

        <div style={quickActionsButtonsStyle}>
          <ActionButton
            primary
            label="📖 Browse Books"
            onClick={() => navigate("/books")}
          />

          <ActionButton
            label="📄 My Issues"
            onClick={() => navigate("/issues")}
          />

          <ActionButton
            label="🔖 My Reservations"
            onClick={() =>
              navigate("/reservations")
            }
          />

          <ActionButton
            label="₹ My Fines"
            onClick={() => navigate("/fines")}
          />

          <ActionButton
            label="💡 Recommendations"
            onClick={() =>
              navigate("/recommendations")
            }
          />
        </div>
      </div>
    </div>
  );
}

/* ================================================== */
/* METRIC CARD */
/* ================================================== */

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

      <div>
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

/* ================================================== */
/* ACTION BUTTON */
/* ================================================== */

function ActionButton({
  label,
  onClick,
  primary = false,
}) {
  const [hovered, setHovered] = useState(false);

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

/* ================================================== */
/* STYLES */
/* ================================================== */

const pageStyle = {
  width: "100%",
  boxSizing: "border-box",
};

const headerStyle = {
  marginBottom: "26px",
};

const titleStyle = {
  margin: 0,
  fontSize: "38px",
  fontWeight: "700",
  color: "#111827",
};

const subtitleStyle = {
  margin: "6px 0 0 0",
  color: "#6b7280",
  fontSize: "16px",
};

const welcomeCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",

  backgroundColor: "#ffffff",

  padding: "24px 28px",

  borderRadius: "14px",

  border: "1px solid #e5e7eb",

  boxShadow:
    "0 4px 14px rgba(15, 23, 42, 0.05)",

  marginBottom: "28px",
};

const welcomeLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: "20px",
};

const avatarStyle = {
  width: "70px",
  height: "70px",

  borderRadius: "50%",

  backgroundColor: "#eff6ff",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  fontSize: "32px",
};

const welcomeSmallStyle = {
  color: "#475569",
  fontSize: "15px",
  fontWeight: "600",
  marginBottom: "5px",
};

const welcomeNameStyle = {
  margin: "0 0 10px 0",
  color: "#111827",
  fontSize: "26px",
  fontWeight: "700",
};

const userDetailsStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",

  color: "#64748b",

  fontSize: "14px",
};

const dividerStyle = {
  color: "#cbd5e1",
};

const memberBadgeStyle = {
  padding: "10px 18px",

  borderRadius: "25px",

  backgroundColor: "#eff6ff",
  color: "#2563eb",

  border: "1px solid #bfdbfe",

  fontSize: "13px",
  fontWeight: "700",
};

/* ================================================== */
/* METRIC GRID */
/* ================================================== */

const metricsGridStyle = {
  display: "grid",

  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",

  gap: "18px",

  marginBottom: "28px",
};

const metricCardStyle = {
  backgroundColor: "#ffffff",

  minHeight: "115px",

  padding: "20px",

  borderRadius: "12px",

  border: "1px solid #e5e7eb",

  boxShadow:
    "0 4px 12px rgba(15, 23, 42, 0.05)",

  display: "flex",
  alignItems: "flex-start",

  gap: "16px",

  boxSizing: "border-box",
};

const metricIconStyle = {
  width: "54px",
  height: "54px",

  borderRadius: "12px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  flexShrink: 0,

  fontSize: "25px",
};

const metricTitleStyle = {
  color: "#475569",

  fontSize: "14px",
  fontWeight: "600",

  marginBottom: "7px",
};

const metricValueStyle = {
  color: "#0f172a",

  fontSize: "30px",
  fontWeight: "700",

  lineHeight: "1",

  marginBottom: "8px",
};

const metricDescriptionStyle = {
  color: "#94a3b8",

  fontSize: "12px",

  lineHeight: "1.4",
};

/* ================================================== */
/* QUICK ACTIONS */
/* ================================================== */

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
    "repeat(5, minmax(130px, 1fr))",

  gap: "12px",
};

const actionButtonBaseStyle = {
  padding: "12px 14px",

  borderRadius: "8px",

  cursor: "pointer",

  fontSize: "14px",
  fontWeight: "600",

  transition: "all 0.2s ease",
};

/* ================================================== */
/* MESSAGES */
/* ================================================== */

const loadingStyle = {
  padding: "40px",
  textAlign: "center",
  color: "#6b7280",
};

const errorStyle = {
  backgroundColor: "#fee2e2",

  color: "#991b1b",

  padding: "12px 15px",

  borderRadius: "8px",

  marginBottom: "20px",

  border: "1px solid #fecaca",
};

export default MemberDashboard;