import { API_BASE_URL } from "../config";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function LibrarianDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role_id");
    localStorage.removeItem("role");
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const loadDashboard = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      try {
        setLoading(true);
        setError("");

        const [userResponse, dashboardResponse] =
          await Promise.all([
            axios.get(
              `${API_BASE_URL}/users/me`,
              config
            ),
            axios.get(
              `${API_BASE_URL}/users/librarian/dashboard`,
              config
            ),
          ]);

        setUser(userResponse.data);
        setDashboard(dashboardResponse.data);
      } catch (requestError) {
        console.error(
          "Librarian Dashboard Error:",
          requestError
        );

        if (requestError.response?.status === 401) {
          handleLogout();
          return;
        }

        if (requestError.response?.status === 403) {
          setError(
            "You do not have permission to access the Librarian Dashboard."
          );
          return;
        }

        setError(
          requestError.response?.data?.detail ||
            "Unable to load librarian dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getValue = (possibleKeys, fallback = 0) => {
    if (!dashboard) return fallback;

    for (const key of possibleKeys) {
      if (
        dashboard[key] !== undefined &&
        dashboard[key] !== null
      ) {
        return dashboard[key];
      }
    }

    return fallback;
  };

  if (loading) {
    return (
      <div style={loadingStyle}>
        Loading librarian dashboard...
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Librarian Dashboard</h1>
        <p style={subtitleStyle}>
          Manage daily library operations
        </p>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {user && (
        <div style={welcomeCardStyle}>
          <div style={welcomeLeftStyle}>
            <div style={avatarStyle}>📚</div>
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
                <span style={dividerStyle}>|</span>
                <span>
                  <strong>Email:</strong>{" "}
                  {user.email || "-"}
                </span>
              </div>
            </div>
          </div>
          <div style={librarianBadgeStyle}>
            📚 LIBRARIAN
          </div>
        </div>
      )}

      <div style={metricsGridStyle}>
        <MetricCard
          icon="📖"
          iconBackground="#dbeafe"
          title="Issued Books"
          value={getValue([
            "issued_books",
            "currently_issued",
            "active_issues",
            "total_issued_books",
          ])}
          description="Books currently issued"
        />
        <MetricCard
          icon="⏰"
          iconBackground="#fee2e2"
          title="Overdue Books"
          value={getValue([
            "overdue_books",
            "total_overdue_books",
          ])}
          description="Books past their due date"
        />
        <MetricCard
          icon="🔖"
          iconBackground="#ede9fe"
          title="Active Reservations"
          value={getValue([
            "active_reservations",
            "reservations_active",
          ])}
          description="Reservations currently active"
        />
        <MetricCard
          icon="📦"
          iconBackground="#ffedd5"
          title="Ready for Pickup"
          value={getValue([
            "ready_for_pickup",
            "ready_reservations",
          ])}
          description="Reserved books ready for collection"
        />
        <MetricCard
          icon="📚"
          iconBackground="#dcfce7"
          title="Available Books"
          value={getValue([
            "available_copies",
            "available_books",
          ])}
          description="Copies currently available"
        />
        <MetricCard
          icon="₹"
          iconBackground="#fef3c7"
          title="Outstanding Fines"
          value={`₹${getValue([
            "outstanding_fines",
            "unpaid_fines",
          ])}`}
          description="Unpaid member fines"
        />
      </div>

      <div style={quickActionsCardStyle}>
        <div style={quickActionsHeaderStyle}>
          <h2 style={quickActionsTitleStyle}>
            Quick Actions
          </h2>
          <p style={quickActionsSubtitleStyle}>
            Access frequently used librarian operations
          </p>
        </div>
        <div style={quickActionsButtonsStyle}>
          <ActionButton
            primary
            label="📚 Manage Books"
            onClick={() => navigate("/books")}
          />
          <ActionButton
            label="📖 Issue / Return Books"
            onClick={() => navigate("/issues")}
          />
          <ActionButton
            label="🔖 Reservations"
            onClick={() => navigate("/reservations")}
          />
          <ActionButton
            label="₹ Fines"
            onClick={() => navigate("/fines")}
          />
          <ActionButton
            label="📊 Reports"
            onClick={() => navigate("/reports")}
          />
        </div>
      </div>
    </div>
  );
}

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
        <div style={metricTitleStyle}>{title}</div>
        <div style={metricValueStyle}>{value ?? 0}</div>
        <div style={metricDescriptionStyle}>
          {description}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ label, onClick, primary = false }) {
  const [hovered, setHovered] = useState(false);
  const style = {
    ...actionButtonBaseStyle,
    backgroundColor: primary
      ? hovered
        ? "#1d4ed8"
        : "#2563eb"
      : hovered
        ? "#eff6ff"
        : "#ffffff",
    color: primary ? "#ffffff" : "#2563eb",
    border: primary
      ? "1px solid #2563eb"
      : "1px solid #93c5fd",
  };

  return (
    <button
      type="button"
      style={style}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </button>
  );
}

const pageStyle = { width: "100%", boxSizing: "border-box" };
const headerStyle = { marginBottom: "24px" };
const titleStyle = {
  margin: 0,
  fontSize: "36px",
  fontWeight: "700",
  color: "#111827",
};
const subtitleStyle = {
  margin: "6px 0 0",
  color: "#6b7280",
  fontSize: "15px",
};
const welcomeCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "18px",
  backgroundColor: "#ffffff",
  padding: "22px 26px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 4px 14px rgba(15,23,42,0.05)",
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
  fontSize: "30px",
};
const welcomeSmallStyle = {
  color: "#475569",
  fontSize: "14px",
  fontWeight: "600",
  marginBottom: "4px",
};
const welcomeNameStyle = {
  margin: "0 0 9px",
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
const dividerStyle = { color: "#cbd5e1" };
const librarianBadgeStyle = {
  padding: "9px 16px",
  borderRadius: "22px",
  backgroundColor: "#eff6ff",
  color: "#2563eb",
  border: "1px solid #bfdbfe",
  fontSize: "12px",
  fontWeight: "700",
};
const metricsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "18px",
  marginBottom: "26px",
};
const metricCardStyle = {
  backgroundColor: "#ffffff",
  minHeight: "112px",
  padding: "19px",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 4px 12px rgba(15,23,42,0.05)",
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
const quickActionsCardStyle = {
  backgroundColor: "#ffffff",
  padding: "22px",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 4px 12px rgba(15,23,42,0.04)",
};
const quickActionsHeaderStyle = { marginBottom: "16px" };
const quickActionsTitleStyle = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
  fontWeight: "700",
};
const quickActionsSubtitleStyle = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: "13px",
};
const quickActionsButtonsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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

export default LibrarianDashboard;
