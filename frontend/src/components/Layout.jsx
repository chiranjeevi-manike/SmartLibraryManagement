import { useState } from "react";

import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

function Layout() {
  const navigate = useNavigate();

  const [libraryOpen, setLibraryOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);

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

  // 2 = ADMIN
  // 3 = LIBRARIAN
  // 4 = MEMBER

  const isAdmin = roleId === 2;
  const isLibrarian = roleId === 3;
  const isMember = roleId === 4;

  const isStaff = isAdmin || isLibrarian;

  // ==================================================
  // LOGOUT
  // ==================================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role_id");

    navigate("/");
  };

  // ==================================================
  // DASHBOARD PATH
  // ==================================================

  const getDashboardPath = () => {
    if (isAdmin) return "/dashboard";

    if (isLibrarian) {
      return "/librarian-dashboard";
    }

    if (isMember) {
      return "/member-dashboard";
    }

    return "/";
  };

  // ==================================================
  // ROLE NAME
  // ==================================================

  const getRoleName = () => {
    if (isAdmin) return "Administrator";
    if (isLibrarian) return "Librarian";
    if (isMember) return "Member";

    return "User";
  };

  // ==================================================
  // USER INITIALS
  // ==================================================

  const getInitials = () => {
    const name =
      storedUser.full_name ||
      storedUser.username ||
      "User";

    const words = name
      .trim()
      .split(" ")
      .filter(Boolean);

    if (words.length >= 2) {
      return (
        words[0][0] +
        words[words.length - 1][0]
      ).toUpperCase();
    }

    return name.substring(0, 2).toUpperCase();
  };

  // ==================================================
  // NAVIGATION STYLE
  // ==================================================

  const linkStyle = ({ isActive }) => ({
    display: "flex",

    alignItems: "center",

    width: "100%",

    boxSizing: "border-box",

    padding: "8px 12px",

    marginBottom: "4px",

    textDecoration: "none",

    borderRadius: "8px",

    color: "#ffffff",

    backgroundColor: isActive
      ? "#2563eb"
      : "#273548",

    fontWeight: isActive ? "600" : "500",

    fontSize: "14px",

    border: isActive
      ? "1px solid #3b82f6"
      : "1px solid #334155",

    transition: "all 0.2s ease",

    boxShadow: isActive
      ? "0 4px 12px rgba(37, 99, 235, 0.25)"
      : "none",
  });

  // ==================================================
  // NAVIGATION ITEM
  // ==================================================

  const NavigationItem = ({
    to,
    icon,
    children,
  }) => {
    return (
      <NavLink
        to={to}
        style={linkStyle}
      >
        <span
          style={{
            width: "28px",

            marginRight: "10px",

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            fontSize: "18px",
          }}
        >
          {icon}
        </span>

        <span>{children}</span>
      </NavLink>
    );
  };

  // ==================================================
  // COLLAPSIBLE SECTION
  // ==================================================

  const SectionHeader = ({
    title,
    isOpen,
    onToggle,
  }) => (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 10px",
        margin: "7px 0 5px",
        border: "none",
        borderRadius: "7px",
        backgroundColor: "#0f172a",
        color: "#94a3b8",
        cursor: "pointer",
        fontSize: "11px",
        fontWeight: "700",
        letterSpacing: "0.7px",
        textTransform: "uppercase",
      }}
    >
      <span>{title}</span>
      <span
        style={{
          color: "#60a5fa",
          fontSize: "12px",
        }}
      >
        {isOpen ? "−" : "+"}
      </span>
    </button>
  );

  // ==================================================
  // PAGE
  // ==================================================

  return (
    <div
      style={{
        display: "flex",

        minHeight: "100vh",

        backgroundColor: "#f5f7fb",
      }}
    >
      {/* ============================================== */}
      {/* SIDEBAR */}
      {/* ============================================== */}

      <aside
        style={{
          width: "255px",

          minWidth: "255px",

          height: "100vh",

          backgroundColor: "#111c2d",

          padding: "16px 14px",

          boxSizing: "border-box",

          display: "flex",

          flexDirection: "column",

          position: "sticky",

          top: 0,

          overflow: "hidden",
        }}
      >
        {/* ========================================== */}
        {/* BRAND */}
        {/* ========================================== */}

        <div
          style={{
            padding: "0 8px",

            marginBottom: "12px",
          }}
        >
          <h2
            style={{
              color: "#ffffff",

              margin: 0,

              fontSize: "24px",

              fontWeight: "700",

              letterSpacing: "-0.4px",
            }}
          >
            Smart Library
          </h2>

          <div
            style={{
              marginTop: "7px",

              color: "#94a3b8",

              fontSize: "13px",
            }}
          >
            Library Management System
          </div>
        </div>

        {/* ========================================== */}
        {/* ROLE */}
        {/* ========================================== */}

        <div
          style={{
            display: "flex",

            justifyContent: "center",

            marginBottom: "12px",
          }}
        >
          <span
            style={{
              display: "inline-flex",

              alignItems: "center",

              justifyContent: "center",

              padding: "7px 16px",

              borderRadius: "22px",

              backgroundColor: "#0f172a",

              color: "#60a5fa",

              border: "1px solid #334155",

              fontSize: "12px",

              fontWeight: "700",
            }}
          >
            {getRoleName()}
          </span>
        </div>

        {/* ========================================== */}
        {/* NAVIGATION */}
        {/* ========================================== */}

        <nav
          style={{
            flex: 1,

            overflowY: "auto",

            paddingRight: "3px",

            scrollbarWidth: "thin",

            scrollbarColor:
              "#64748b transparent",
          }}
        >
          {/* DASHBOARD */}

          <NavigationItem
            to={getDashboardPath()}
            icon="⌂"
          >
            Dashboard
          </NavigationItem>

          {/* ======================================== */}
          {/* LIBRARY */}
          {/* ======================================== */}

          <SectionHeader
            title="Library"
            isOpen={libraryOpen}
            onToggle={() => setLibraryOpen(!libraryOpen)}
          />

          {libraryOpen && (
            <>
              <NavigationItem
                to="/books"
                icon="▤"
              >
                {isMember
                  ? "Browse Books"
                  : "Books"}
              </NavigationItem>

              <NavigationItem
                to="/issues"
                icon="▧"
              >
                {isMember
                  ? "My Issues"
                  : "Issues"}
              </NavigationItem>

              <NavigationItem
                to="/fines"
                icon="₹"
              >
                {isMember
                  ? "My Fines"
                  : "Fines"}
              </NavigationItem>

              <NavigationItem
                to="/reservations"
                icon="◇"
              >
                {isMember
                  ? "My Reservations"
                  : "Reservations"}
              </NavigationItem>

              {isMember && (
                <>
                  <NavigationItem
                    to="/ratings"
                    icon="☆"
                  >
                    Ratings
                  </NavigationItem>

                  <NavigationItem
                    to="/recommendations"
                    icon="♧"
                  >
                    Recommendations
                  </NavigationItem>
                </>
              )}
            </>
          )}

          {/* ======================================== */}
          {/* ACCOUNT */}
          {/* ======================================== */}

          <SectionHeader
            title="Account"
            isOpen={accountOpen}
            onToggle={() => setAccountOpen(!accountOpen)}
          />

          {accountOpen && (
            <>
              <NavigationItem
                to="/notifications"
                icon="♢"
              >
                Notifications
              </NavigationItem>

              <NavigationItem
                to="/my-profile"
                icon="♙"
              >
                My Profile
              </NavigationItem>

              <NavigationItem
                to="/change-password"
                icon="⚿"
              >
                Change Password
              </NavigationItem>
            </>
          )}

          {/* ======================================== */}
          {/* ADMINISTRATION */}
          {/* ======================================== */}

          {isStaff && (
            <>
              <SectionHeader
                title="Administration"
                isOpen={adminOpen}
                onToggle={() => setAdminOpen(!adminOpen)}
              />

              {adminOpen && (
                <>
                  <NavigationItem
                    to="/reports"
                    icon="▥"
                  >
                    Reports
                  </NavigationItem>

                  {isAdmin && (
                    <>
                      <NavigationItem
                        to="/analytics"
                        icon="▥"
                      >
                        Analytics
                      </NavigationItem>

                      <NavigationItem
                        to="/executive-dashboard"
                        icon="◆"
                      >
                        Executive Dashboard
                      </NavigationItem>

                      <NavigationItem
                        to="/library-activity"
                        icon="◫"
                      >
                        Library Activity
                      </NavigationItem>

                      <NavigationItem
                        to="/due-monitoring"
                        icon="◷"
                      >
                        Due Monitoring
                      </NavigationItem>

                      <NavigationItem
                        to="/reminder-monitoring"
                        icon="♢"
                      >
                        Reminder Monitoring
                      </NavigationItem>

                      <NavigationItem
                        to="/inventory-monitoring"
                        icon="▦"
                      >
                        Inventory Monitoring
                      </NavigationItem>

                      <NavigationItem
                        to="/member-risk-monitoring"
                        icon="⚠"
                      >
                        Member Risk Monitoring
                      </NavigationItem>

                      <NavigationItem
                        to="/system-health"
                        icon="◉"
                      >
                        System Health
                      </NavigationItem>

                      <NavigationItem
                        to="/reservation-demand-monitoring"
                        icon="≋"
                      >
                        Reservation Demand
                      </NavigationItem>

                      <NavigationItem
                        to="/fine-monitoring"
                        icon="₹"
                      >
                        Fine Monitoring
                      </NavigationItem>

                      <NavigationItem
                        to="/circulation-monitoring"
                        icon="↻"
                      >
                        Circulation Monitoring
                      </NavigationItem>

                      <NavigationItem
                        to="/collection-development-monitoring"
                        icon="▣"
                      >
                        Collection Development
                      </NavigationItem>

                      <NavigationItem
                        to="/audit-logs"
                        icon="☷"
                      >
                        Audit Logs
                      </NavigationItem>

                      <NavigationItem
                        to="/security-dashboard"
                        icon="⚿"
                      >
                        Security Dashboard
                      </NavigationItem>

                      <NavigationItem
                        to="/users"
                        icon="♙"
                      >
                        Users
                      </NavigationItem>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </nav>

        {/* ========================================== */}
        {/* PROFILE */}
        {/* ========================================== */}

        <div
          style={{
            marginTop: "14px",

            paddingTop: "16px",

            borderTop: "1px solid #334155",
          }}
        >
          <div
            style={{
              display: "flex",

              alignItems: "center",

              gap: "11px",

              marginBottom: "14px",

              padding: "0 4px",
            }}
          >
            {/* AVATAR */}

            <div
              style={{
                width: "42px",

                height: "42px",

                minWidth: "42px",

                borderRadius: "50%",

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                backgroundColor: "#1d4ed8",

                color: "#ffffff",

                fontSize: "13px",

                fontWeight: "700",

                boxShadow:
                  "0 3px 8px rgba(37, 99, 235, 0.25)",
              }}
            >
              {getInitials()}
            </div>

            {/* USER DETAILS */}

            <div
              style={{
                minWidth: 0,

                flex: 1,
              }}
            >
              <div
                style={{
                  color: "#ffffff",

                  fontSize: "13px",

                  fontWeight: "600",

                  overflow: "hidden",

                  textOverflow: "ellipsis",

                  whiteSpace: "nowrap",
                }}
              >
                {storedUser.full_name ||
                  storedUser.username ||
                  "User"}
              </div>

              <div
                style={{
                  marginTop: "4px",

                  color: "#94a3b8",

                  fontSize: "11px",

                  overflow: "hidden",

                  textOverflow: "ellipsis",

                  whiteSpace: "nowrap",
                }}
              >
                {storedUser.email || ""}
              </div>
            </div>
          </div>

          {/* ======================================== */}
          {/* SIGN OUT */}
          {/* ======================================== */}

          <button
            onClick={handleLogout}
            style={{
              width: "100%",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              gap: "8px",

              padding: "10px 14px",

              cursor: "pointer",

              border: "1px solid #ef4444",

              borderRadius: "8px",

              backgroundColor: "transparent",

              color: "#f87171",

              fontSize: "13px",

              fontWeight: "600",

              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "#dc2626";

              e.currentTarget.style.color =
                "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                "transparent";

              e.currentTarget.style.color =
                "#f87171";
            }}
          >
            <span
              style={{
                fontSize: "16px",
              }}
            >
              ↪
            </span>

            Sign Out
          </button>
        </div>
      </aside>

      {/* ============================================== */}
      {/* MAIN CONTENT */}
      {/* ============================================== */}

      <main
        style={{
          flex: 1,

          minWidth: 0,

          padding: "28px 32px",

          boxSizing: "border-box",

          overflowX: "auto",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;